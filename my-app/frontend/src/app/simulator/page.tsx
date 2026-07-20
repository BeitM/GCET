"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AIFeedback, ArtifactPhysicsState, ArtifactRowId, CoordinateSystem, ShotPhysicsState, TelemetryFrame } from "@/lib/types";
import { AIFeedbackPanel } from "@/components/AIFeedbackPanel";
import { FieldSimulator } from "@/components/FieldSimulator";
import { InputPanel } from "@/components/InputPanel";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { robotPresets, RobotPresetId } from "@/lib/robots";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/hooks/useTranslation";
import { getTranslation } from "@/lib/translations";

type StartPose = { x: number; y: number; heading: number };
type ArtifactSpec = { id: string; row: ArtifactRowId; x: number; y: number; color: "green" | "purple" };
type SimArtifact = ArtifactPhysicsState & { vx: number; vy: number };
type RobotCommand =
  | { type: "drive"; direction: "forward" | "backward" | "left" | "right"; distance: number }
  | { type: "driveTo"; x: number; y: number; heading?: number }
  | { type: "spinFlywheel"; rpm: number }
  | { type: "shoot"; angle: number }
  | { type: "intake"; mode: "in" | "out" | "off" }
  | { type: "wait"; seconds: number };

const defaultGoal = "Drive forward, move left, spin up the shooter, and launch one artifact.";
const defaultCode = `driveForward(24);
driveLeft(12);
spinFlywheel(3600);
shoot();`;
const defaultStartPose: StartPose = { x: 20, y: 122, heading: 0 };
const defaultArtifactRows: ArtifactRowId[] = ["topLoading", "topRight", "topCenter", "topLeft", "bottomLoading", "bottomRight", "bottomCenter", "bottomLeft"];
const SIMULATION_FPS = 60;
const SIMULATION_FRAME_SECONDS = 1 / SIMULATION_FPS;
const PLAYBACK_INTERVAL_MS = 1000 / SIMULATION_FPS;
const SHOT_RETURN_Y_METERS = -24 * 0.0254;
const SHOT_START_Y_METERS = 0.34;
const GRAVITY_METERS_PER_SECOND = 9.81;
const POST_RETURN_SETTLE_SECONDS = 3;
const FLYWHEEL_RAMP_TIME_SCALE = 0.67;
const FIELD_SIZE_INCHES = 144;
const ARTIFACT_RADIUS_INCHES = 2.5;
const ARTIFACT_WALL_CLEARANCE_INCHES = 3.25;
const ARTIFACT_RESTITUTION = 0.32;
const ARTIFACT_FRICTION_PER_SECOND = 4.2;
const artifactSpecs: ArtifactSpec[] = [
  { id: "top-loading-purple-left", row: "topLoading", x: 126.75, y: 138, color: "purple" },
  { id: "top-loading-green", row: "topLoading", x: 133.75, y: 138, color: "green" },
  { id: "top-loading-purple-right", row: "topLoading", x: 140.75, y: 138, color: "purple" },
  { id: "top-left-green", row: "topLeft", x: 60, y: 125, color: "green" },
  { id: "top-left-purple-mid", row: "topLeft", x: 60, y: 120, color: "purple" },
  { id: "top-left-purple-low", row: "topLeft", x: 60, y: 115, color: "purple" },
  { id: "top-center-purple-high", row: "topCenter", x: 84, y: 125, color: "purple" },
  { id: "top-center-green", row: "topCenter", x: 84, y: 120, color: "green" },
  { id: "top-center-purple-low", row: "topCenter", x: 84, y: 115, color: "purple" },
  { id: "top-right-purple-high", row: "topRight", x: 108, y: 125, color: "purple" },
  { id: "top-right-purple-mid", row: "topRight", x: 108, y: 120, color: "purple" },
  { id: "top-right-green", row: "topRight", x: 108, y: 115, color: "green" },
  { id: "bottom-left-purple-high", row: "bottomLeft", x: 60, y: 29, color: "purple" },
  { id: "bottom-left-purple-mid", row: "bottomLeft", x: 60, y: 24, color: "purple" },
  { id: "bottom-left-green", row: "bottomLeft", x: 60, y: 19, color: "green" },
  { id: "bottom-center-purple-high", row: "bottomCenter", x: 84, y: 29, color: "purple" },
  { id: "bottom-center-green", row: "bottomCenter", x: 84, y: 24, color: "green" },
  { id: "bottom-center-purple-low", row: "bottomCenter", x: 84, y: 19, color: "purple" },
  { id: "bottom-right-green", row: "bottomRight", x: 108, y: 29, color: "green" },
  { id: "bottom-right-purple-mid", row: "bottomRight", x: 108, y: 24, color: "purple" },
  { id: "bottom-right-purple-low", row: "bottomRight", x: 108, y: 19, color: "purple" },
  { id: "bottom-loading-purple-left", row: "bottomLoading", x: 126.75, y: 6, color: "purple" },
  { id: "bottom-loading-green", row: "bottomLoading", x: 133.75, y: 6, color: "green" },
  { id: "bottom-loading-purple-right", row: "bottomLoading", x: 140.75, y: 6, color: "purple" },
];

const baseFrame: TelemetryFrame = {
  x: defaultStartPose.x,
  y: defaultStartPose.y,
  heading: defaultStartPose.heading,
  leftPower: 0,
  rightPower: 0,
  leftEncoder: 0,
  rightEncoder: 0,
  shooterTarget: 0,
  shooterRpm: 0,
  feeder: false,
  armTarget: 0,
  armPosition: 0,
  intake: "off",
  claw: "closed",
  artifactCount: 0,
  time: 0,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalizeHeading = (value: number) => {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};
const headingDelta = (start: number, end: number) => ((end - start + 540) % 360) - 180;
const lerpHeading = (start: number, end: number, t: number) => normalizeHeading(start + headingDelta(start, end) * t);
const robotFootprintExtents = (heading: number, robotWidth: number, robotLength: number) => {
  const radians = heading * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    x: cos * robotLength / 2 + sin * robotWidth / 2,
    y: sin * robotLength / 2 + cos * robotWidth / 2,
  };
};
const constrainRobotPose = (pose: StartPose, robotWidth: number, robotLength: number) => {
  const extents = robotFootprintExtents(pose.heading, robotWidth, robotLength);
  return {
    ...pose,
    x: clamp(pose.x, extents.x, FIELD_SIZE_INCHES - extents.x),
    y: clamp(pose.y, extents.y, FIELD_SIZE_INCHES - extents.y),
  };
};
const isRobotPoseInsideField = (pose: StartPose, robotWidth: number, robotLength: number) => {
  const constrained = constrainRobotPose(pose, robotWidth, robotLength);
  return Math.abs(constrained.x - pose.x) < 0.001 && Math.abs(constrained.y - pose.y) < 0.001;
};
const cloneArtifactFrameState = (artifacts: SimArtifact[]): ArtifactPhysicsState[] => artifacts.map(({ id, row, color, x, y, roll }) => ({ id, row, color, x, y, roll }));
const createArtifacts = (selectedRows: ArtifactRowId[]): SimArtifact[] => {
  const selected = new Set(selectedRows);
  return artifactSpecs
    .filter((artifact) => selected.has(artifact.row))
    .map((artifact) => ({
      ...artifact,
      x: clamp(artifact.x, ARTIFACT_WALL_CLEARANCE_INCHES, FIELD_SIZE_INCHES - ARTIFACT_WALL_CLEARANCE_INCHES),
      y: clamp(artifact.y, ARTIFACT_WALL_CLEARANCE_INCHES, FIELD_SIZE_INCHES - ARTIFACT_WALL_CLEARANCE_INCHES),
      roll: 0,
      vx: 0,
      vy: 0,
    }));
};
const resolveArtifactPair = (a: SimArtifact, b: SimArtifact) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 0.0001;
  const minDistance = ARTIFACT_RADIUS_INCHES * 2;
  if (distance >= minDistance) return;

  const nx = dx / distance;
  const ny = dy / distance;
  const correction = (minDistance - distance) / 2;
  a.x -= nx * correction;
  a.y -= ny * correction;
  b.x += nx * correction;
  b.y += ny * correction;

  const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relativeVelocity >= 0) return;

  const impulse = -(1 + ARTIFACT_RESTITUTION) * relativeVelocity / 2;
  a.vx -= impulse * nx;
  a.vy -= impulse * ny;
  b.vx += impulse * nx;
  b.vy += impulse * ny;
};
const resolveArtifactRobotCollision = (
  artifact: SimArtifact,
  robot: StartPose,
  previousRobot: StartPose,
  robotWidth: number,
  robotLength: number,
  dt: number,
) => {
  const headingRadians = robot.heading * Math.PI / 180;
  const forward = { x: Math.cos(headingRadians), y: -Math.sin(headingRadians) };
  const right = { x: Math.sin(headingRadians), y: Math.cos(headingRadians) };
  const dx = artifact.x - robot.x;
  const dy = artifact.y - robot.y;
  const localForward = dx * forward.x + dy * forward.y;
  const localRight = dx * right.x + dy * right.y;
  const halfLength = robotLength / 2;
  const halfWidth = robotWidth / 2;
  const closestForward = clamp(localForward, -halfLength, halfLength);
  const closestRight = clamp(localRight, -halfWidth, halfWidth);
  const deltaForward = localForward - closestForward;
  const deltaRight = localRight - closestRight;
  const distance = Math.hypot(deltaForward, deltaRight);

  if (distance >= ARTIFACT_RADIUS_INCHES) return;

  let normalForward = 0;
  let normalRight = 0;
  if (distance > 0.0001) {
    normalForward = deltaForward / distance;
    normalRight = deltaRight / distance;
  } else {
    const forwardPenetration = halfLength - Math.abs(localForward);
    const rightPenetration = halfWidth - Math.abs(localRight);
    if (forwardPenetration < rightPenetration) normalForward = localForward >= 0 ? 1 : -1;
    else normalRight = localRight >= 0 ? 1 : -1;
  }

  const nx = forward.x * normalForward + right.x * normalRight;
  const ny = forward.y * normalForward + right.y * normalRight;
  const penetration = ARTIFACT_RADIUS_INCHES - distance;
  artifact.x += nx * penetration;
  artifact.y += ny * penetration;

  const robotVx = (robot.x - previousRobot.x) / dt;
  const robotVy = (robot.y - previousRobot.y) / dt;
  const normalVelocity = (artifact.vx - robotVx) * nx + (artifact.vy - robotVy) * ny;
  if (normalVelocity < 0) {
    const impulse = -(1 + ARTIFACT_RESTITUTION) * normalVelocity;
    artifact.vx += nx * impulse;
    artifact.vy += ny * impulse;
  }
  artifact.vx += robotVx * 0.22;
  artifact.vy += robotVy * 0.22;
};
const stepArtifactPhysics = (
  artifacts: SimArtifact[],
  robot: StartPose,
  previousRobot: StartPose,
  robotWidth: number,
  robotLength: number,
  dt: number,
) => {
  const damping = Math.exp(-ARTIFACT_FRICTION_PER_SECOND * dt);

  for (const artifact of artifacts) {
    artifact.x += artifact.vx * dt;
    artifact.y += artifact.vy * dt;
    artifact.roll += Math.hypot(artifact.vx, artifact.vy) * dt / ARTIFACT_RADIUS_INCHES;
    artifact.vx *= damping;
    artifact.vy *= damping;

    if (artifact.x < ARTIFACT_RADIUS_INCHES) {
      artifact.x = ARTIFACT_RADIUS_INCHES;
      artifact.vx = Math.abs(artifact.vx) * ARTIFACT_RESTITUTION;
    }
    if (artifact.x > FIELD_SIZE_INCHES - ARTIFACT_RADIUS_INCHES) {
      artifact.x = FIELD_SIZE_INCHES - ARTIFACT_RADIUS_INCHES;
      artifact.vx = -Math.abs(artifact.vx) * ARTIFACT_RESTITUTION;
    }
    if (artifact.y < ARTIFACT_RADIUS_INCHES) {
      artifact.y = ARTIFACT_RADIUS_INCHES;
      artifact.vy = Math.abs(artifact.vy) * ARTIFACT_RESTITUTION;
    }
    if (artifact.y > FIELD_SIZE_INCHES - ARTIFACT_RADIUS_INCHES) {
      artifact.y = FIELD_SIZE_INCHES - ARTIFACT_RADIUS_INCHES;
      artifact.vy = -Math.abs(artifact.vy) * ARTIFACT_RESTITUTION;
    }
  }

  for (let i = 0; i < artifacts.length; i++) {
    resolveArtifactRobotCollision(artifacts[i], robot, previousRobot, robotWidth, robotLength, dt);
  }
  for (let i = 0; i < artifacts.length; i++) {
    for (let j = i + 1; j < artifacts.length; j++) resolveArtifactPair(artifacts[i], artifacts[j]);
  }
};

function displayPositionFromField(pose: StartPose, coordinateSystem: CoordinateSystem) {
  if (coordinateSystem === "center") return { x: pose.x - 72, y: 72 - pose.y };
  return { x: pose.x, y: 144 - pose.y };
}

function fieldPositionFromDisplay(x: number, y: number, coordinateSystem: CoordinateSystem) {
  if (coordinateSystem === "center") {
    return {
      x: clamp(x, -72, 72) + 72,
      y: 72 - clamp(y, -72, 72),
    };
  }

  return {
    x: clamp(x, 0, 144),
    y: 144 - clamp(y, 0, 144),
  };
}

function parseArgs(raw: string) {
  if (!raw.trim()) return [];
  return raw.split(",").map((arg) => Number(arg.trim())).filter((value) => Number.isFinite(value));
}

function parseRobotCode(source: string): RobotCommand[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/[;\n]/)
    .map((line) => line.replace(/\/\/.*$/g, "").trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-zA-Z_][\w]*)\s*\((.*)\)$/);
      if (!match) return null;

      const name = match[1].toLowerCase();
      const args = parseArgs(match[2]);
      const first = args[0];
      const distance = Number.isFinite(first) ? first : 16;

      if (name === "driveforward" || name === "move_forward" || name === "moveup" || name === "move_up") return { type: "drive", direction: "forward", distance } satisfies RobotCommand;
      if (name === "driveback" || name === "drivebackward" || name === "move_backward" || name === "movedown" || name === "move_down") return { type: "drive", direction: "backward", distance } satisfies RobotCommand;
      if (name === "driveleft" || name === "strafeleft" || name === "move_left") return { type: "drive", direction: "left", distance } satisfies RobotCommand;
      if (name === "driveright" || name === "straferight" || name === "move_right") return { type: "drive", direction: "right", distance } satisfies RobotCommand;
      if (name === "drivetoposition" && args.length >= 2) return { type: "driveTo", x: args[0], y: args[1], heading: args.length >= 3 ? args[2] : undefined } satisfies RobotCommand;
      if (name === "spinflywheel") return { type: "spinFlywheel", rpm: clamp(first || 0, 0, 6000) } satisfies RobotCommand;
      if (name === "shoot") return { type: "shoot", angle: clamp(Number.isFinite(first) ? first : 45, 20, 70) } satisfies RobotCommand;
      if (name === "intakespinin") return { type: "intake", mode: "in" } satisfies RobotCommand;
      if (name === "intakespinout") return { type: "intake", mode: "out" } satisfies RobotCommand;
      if (name === "intakestopspin" || name === "intakestopspini") return { type: "intake", mode: "off" } satisfies RobotCommand;
      if (name === "wait") return { type: "wait", seconds: Math.max(0, first || 0) } satisfies RobotCommand;
      return null;
    })
    .filter(Boolean) as RobotCommand[];
}

function generateRobotCodeFrames(
  source: string,
  startPose: StartPose,
  coordinateSystem: CoordinateSystem,
  preloadCount: number,
  robotWidth: number,
  robotLength: number,
  selectedRows: ArtifactRowId[],
): TelemetryFrame[] {
  const commands = parseRobotCode(source);
  const safePreloadCount = Math.round(clamp(preloadCount, 0, 3));
  const startFrame = { ...baseFrame, ...startPose, artifactCount: safePreloadCount };
  const artifacts = createArtifacts(selectedRows);
  const frames: TelemetryFrame[] = [{ ...startFrame, artifacts: cloneArtifactFrameState(artifacts), event: "Ready" }];
  let current = { ...startPose };
  let time = 0;
  let leftEncoder = 0;
  let rightEncoder = 0;
  let shooterTarget = 0;
  let shooterRpm = 0;
  let intake: TelemetryFrame["intake"] = "off";
  let artifactCount = safePreloadCount;
  let intakeContactBudget = 0;
  let shotId = 0;
  const shots: { time: number; speed: number; angle: number }[] = [];

  const pushFrame = (overrides: Partial<TelemetryFrame> = {}) => {
    frames.push({
      ...startFrame,
      ...current,
      time,
      leftEncoder,
      rightEncoder,
      shooterTarget,
      shooterRpm,
      intake,
      artifactCount,
      artifacts: cloneArtifactFrameState(artifacts),
      ...overrides,
    });
  };
  const stepPhysicsTo = (nextPose: StartPose, dt: number) => {
    const previous = current;
    current = constrainRobotPose(nextPose, robotWidth, robotLength);
    stepArtifactPhysics(artifacts, current, previous, robotWidth, robotLength, dt);
  };

  const maybeCollectArtifact = (eventPrefix: string) => {
    if (intake !== "in") return "";
    intakeContactBudget += 1;
    if (artifactCount < 3) {
      artifactCount += 1;
      return `${eventPrefix}; collected artifact ${artifactCount}`;
    }
    return `${eventPrefix}; controlled 4 artifacts`;
  };

  const advanceWait = (seconds: number, event?: string) => {
    const steps = Math.max(1, Math.ceil(seconds / SIMULATION_FRAME_SECONDS));
    for (let i = 1; i <= steps; i++) {
      const dt = seconds / steps;
      time += dt;
      stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, dt);
      pushFrame({ leftPower: 0, rightPower: 0, feeder: false, event: i === 1 ? event : "" });
    }
  };

  const advanceDrive = (target: StartPose, event: string, gradualHeading: boolean) => {
    const start = { ...current };
    const distance = Math.hypot(target.x - start.x, target.y - start.y);
    const totalTime = Math.max(0.35, distance / 24);
    const steps = Math.max(4, Math.ceil(totalTime / SIMULATION_FRAME_SECONDS));
    const collectAt = Math.max(2, Math.floor(steps * 0.42));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const dt = totalTime / steps;
      time += dt;
      leftEncoder += distance * 5.8 / steps;
      rightEncoder += distance * 5.8 / steps;
      stepPhysicsTo({
        x: lerp(start.x, target.x, t),
        y: lerp(start.y, target.y, t),
        heading: gradualHeading ? lerpHeading(start.heading, target.heading, t) : start.heading,
      }, dt);
      const contactEvent = i === collectAt ? maybeCollectArtifact(event) : "";
      pushFrame({
        leftPower: 0.48,
        rightPower: 0.48,
        feeder: false,
        event: i === 1 ? event : contactEvent,
        warning: contactEvent.includes("controlled 4 artifacts") ? "controlled 4 artifacts" : undefined,
      });
    }

    current = constrainRobotPose(target, robotWidth, robotLength);
  };

  if (commands.length === 0) {
    return [
      ...frames,
      {
        ...startFrame,
        time: 0.1,
        warning: "No supported robot code actions parsed",
      },
    ];
  }

  for (const command of commands) {
    if (command.type === "drive") {
      const headingRadians = THREE_DEGREES_TO_RADIANS * current.heading;
      const forward = { x: Math.cos(headingRadians), y: -Math.sin(headingRadians) };
      const right = { x: Math.sin(headingRadians), y: Math.cos(headingRadians) };
      const target = { ...current };
      const distance = Math.abs(command.distance);
      const sign = command.distance >= 0 ? 1 : -1;

      if (command.direction === "left") {
        target.x -= right.x * distance * sign;
        target.y -= right.y * distance * sign;
      }
      if (command.direction === "right") {
        target.x += right.x * distance * sign;
        target.y += right.y * distance * sign;
      }
      if (command.direction === "forward") {
        target.x += forward.x * distance * sign;
        target.y += forward.y * distance * sign;
      }
      if (command.direction === "backward") {
        target.x -= forward.x * distance * sign;
        target.y -= forward.y * distance * sign;
      }

      const safeTarget = constrainRobotPose(target, robotWidth, robotLength);
      advanceDrive(safeTarget, `drive ${command.direction} ${distance.toFixed(1)} in`, false);
    }

    if (command.type === "driveTo") {
      const targetPosition = fieldPositionFromDisplay(command.x, command.y, coordinateSystem);
      const hasHeading = command.heading !== undefined;
      const target = constrainRobotPose(
        {
          x: targetPosition.x,
          y: targetPosition.y,
          heading: hasHeading ? normalizeHeading(command.heading!) : current.heading,
        },
        robotWidth,
        robotLength,
      );
      advanceDrive(
        target,
        hasHeading ? `driveToPosition ${command.x}, ${command.y}, ${command.heading}` : `driveToPosition ${command.x}, ${command.y}`,
        hasHeading,
      );
    }

    if (command.type === "spinFlywheel") {
      const startRpm = shooterRpm;
      shooterTarget = command.rpm;
      const rampSeconds = Math.max(0.17, Math.abs(command.rpm - startRpm) / 1800 * FLYWHEEL_RAMP_TIME_SCALE);
      const steps = Math.max(3, Math.ceil(rampSeconds / SIMULATION_FRAME_SECONDS));
      for (let i = 1; i <= steps; i++) {
        const dt = rampSeconds / steps;
        time += dt;
        stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, dt);
        shooterRpm = lerp(startRpm, command.rpm, i / steps);
        pushFrame({ leftPower: 0, rightPower: 0, feeder: false, event: i === 1 ? `spinFlywheel ${command.rpm.toFixed(0)} rpm` : "" });
      }
    }

    if (command.type === "shoot") {
      if (artifactCount <= 0) {
        time += 0.1;
        stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, 0.1);
        pushFrame({
          feeder: false,
          event: `Shoot ${command.angle.toFixed(0)} deg`,
          warning: "No artifact loaded to shoot",
        });
        continue;
      }

      shotId += 1;
      artifactCount -= 1;
      const shotSpeed = Math.max(0.5, shooterRpm / 3600 * 8);
      time += SIMULATION_FRAME_SECONDS;
      stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, SIMULATION_FRAME_SECONDS);
      shots.push({ time, speed: shotSpeed, angle: command.angle });
      pushFrame({
        feeder: true,
        event: `Shoot ${command.angle.toFixed(0)} deg`,
        shot: { id: shotId, speed: shotSpeed, angle: command.angle },
      });
      advanceWait(0.2);
    }

    if (command.type === "intake") {
      intake = command.mode;
      if (command.mode === "out") artifactCount = 0;
      advanceWait(0.2, command.mode === "in" ? "intakeSpinIn" : command.mode === "out" ? "intakeSpinOut" : "intakeStopSpin");
    }

    if (command.type === "wait") {
      advanceWait(command.seconds, `wait ${command.seconds.toFixed(1)} s`);
    }
  }

  if (shots.length > 0) {
    const returnTimes = shots.map((shot) => {
      const verticalSpeed = shot.speed * Math.sin(shot.angle * THREE_DEGREES_TO_RADIANS);
      const discriminant = verticalSpeed * verticalSpeed + 2 * GRAVITY_METERS_PER_SECOND * (SHOT_START_Y_METERS - SHOT_RETURN_Y_METERS);
      return shot.time + (verticalSpeed + Math.sqrt(discriminant)) / GRAVITY_METERS_PER_SECOND;
    });
    const finalMovingTime = Math.max(...returnTimes) + POST_RETURN_SETTLE_SECONDS;

    if (finalMovingTime > time) {
      while (time + SIMULATION_FRAME_SECONDS < finalMovingTime) {
        time += SIMULATION_FRAME_SECONDS;
        stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, SIMULATION_FRAME_SECONDS);
        pushFrame({ leftPower: 0, rightPower: 0, feeder: false, event: "" });
      }

      time = finalMovingTime;
      stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, SIMULATION_FRAME_SECONDS);
      pushFrame({ leftPower: 0, rightPower: 0, feeder: false, event: "Objects settled" });
    }
  }

  return frames;
}

const THREE_DEGREES_TO_RADIANS = Math.PI / 180;

const isAIFeedback = (value: unknown): value is AIFeedback => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AIFeedback>;
  return Boolean(
    typeof candidate.headline === "string"
    && (candidate.status === "warning" || candidate.status === "complete")
    && typeof candidate.happened === "string"
    && typeof candidate.cause === "string"
    && Array.isArray(candidate.evidence)
    && candidate.evidence.every((item) => typeof item === "string")
    && typeof candidate.fix === "string"
    && typeof candidate.optimization === "string"
    && typeof candidate.concept === "string",
  );
};

export default function SimulatorDashboard() {
  const { t, language } = useTranslation();
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [goal, setGoal] = useState(defaultGoal);
  const [code, setCode] = useState(defaultCode);
  const [robotId, setRobotId] = useState<RobotPresetId>("turret");
  const [coordinateSystem, setCoordinateSystem] = useState<CoordinateSystem>("corner");
  const [selectedArtifactRows, setSelectedArtifactRows] = useState<ArtifactRowId[]>(defaultArtifactRows);
  const [preloadCount, setPreloadCount] = useState(0);
  const [startX, setStartX] = useState(defaultStartPose.x);
  const [startY, setStartY] = useState(defaultStartPose.y);
  const [startHeading, setStartHeading] = useState(defaultStartPose.heading);
  const [robotWidth, setRobotWidth] = useState(17);
  const [robotLength, setRobotLength] = useState(17);
  const [frames, setFrames] = useState<TelemetryFrame[]>(() => generateRobotCodeFrames(defaultCode, defaultStartPose, "corner", 0, 17, 17, defaultArtifactRows));
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [runId, setRunId] = useState(0);
  const [playbackId, setPlaybackId] = useState(0);
  const [analysis, setAnalysis] = useState<AIFeedback | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [setupWarning, setSetupWarning] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const physicsRecordingFrames = useRef<TelemetryFrame[] | null>(null);
  const physicsRecordingArtifacts = useRef<Map<number, ArtifactPhysicsState[]>>(new Map());
  const physicsRecordingShots = useRef<Map<number, ShotPhysicsState[]>>(new Map());
  const localizedDefaultGoal = useRef(defaultGoal);

  const frame = frames[index] || frames[0];
  const events = frames.slice(0, index + 1).filter((item) => item.event || item.warning);
  const displayStartPosition = displayPositionFromField({ x: startX, y: startY, heading: startHeading }, coordinateSystem);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  useEffect(() => {
    const requestedLevel = new URLSearchParams(window.location.search).get("level");
    if (requestedLevel !== "intermediate" && requestedLevel !== "advanced") return;
    const updateLevel = window.setTimeout(() => setExperienceLevel(requestedLevel), 0);
    return () => window.clearTimeout(updateLevel);
  }, []);

  useEffect(() => {
    const previousDefaultGoal = localizedDefaultGoal.current;
    const nextDefaultGoal = getTranslation(language, "defaultGoal");
    setGoal((current) => current === previousDefaultGoal ? nextDefaultGoal : current);
    localizedDefaultGoal.current = nextDefaultGoal;
  }, [language]);

  const selectRobot = (id: RobotPresetId) => {
    const robot = robotPresets.find((item) => item.id === id)!;
    setRobotId(id);
    setRobotWidth(robot.width);
    setRobotLength(robot.length);
    setSetupWarning("");
  };

  const stopPlayback = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };

  const previewStartPose = (pose: StartPose) => {
    stopPlayback();
    setPlaybackId((id) => id + 1);
    setFrames([{ ...baseFrame, ...pose, artifactCount: preloadCount, artifacts: cloneArtifactFrameState(createArtifacts(selectedArtifactRows)), event: "Ready" }]);
    setIndex(0);
    setHasRun(false);
    setAnalysis(null);
    setSetupWarning("");
  };

  const updatePreloadCount = (value: number) => {
    const next = Math.round(clamp(value, 0, 3));
    setPreloadCount(next);
    stopPlayback();
    setPlaybackId((id) => id + 1);
    setFrames([{ ...baseFrame, x: startX, y: startY, heading: startHeading, artifactCount: next, artifacts: cloneArtifactFrameState(createArtifacts(selectedArtifactRows)), event: "Ready" }]);
    setIndex(0);
    setHasRun(false);
    setAnalysis(null);
    setSetupWarning("");
  };

  const updateStartX = (value: number) => {
    const next = fieldPositionFromDisplay(value, displayStartPosition.y, coordinateSystem);
    setStartX(next.x);
    setStartY(next.y);
    previewStartPose({ x: next.x, y: next.y, heading: startHeading });
  };

  const updateStartY = (value: number) => {
    const next = fieldPositionFromDisplay(displayStartPosition.x, value, coordinateSystem);
    setStartX(next.x);
    setStartY(next.y);
    previewStartPose({ x: next.x, y: next.y, heading: startHeading });
  };

  const updateStartHeading = (value: number) => {
    const next = normalizeHeading(clamp(value, 0, 360));
    setStartHeading(next);
    previewStartPose({ x: startX, y: startY, heading: next });
  };

  const commitPhysicsRecording = (fallbackFrames: TelemetryFrame[], endIndex = fallbackFrames.length - 1) => {
    const recorded = (physicsRecordingFrames.current || fallbackFrames).slice(0, endIndex + 1);
    const artifactFrames = physicsRecordingArtifacts.current;
    const shotFrames = physicsRecordingShots.current;
    let lastArtifacts: ArtifactPhysicsState[] | undefined = recorded[0]?.artifacts;
    let lastShots: ShotPhysicsState[] | undefined = recorded[0]?.shots;
    const nextFrames = recorded.map((frame, frameIndex) => {
      const recordedArtifacts = artifactFrames.get(frameIndex);
      const recordedShots = shotFrames.get(frameIndex);
      if (recordedArtifacts) lastArtifacts = recordedArtifacts;
      if (recordedShots) lastShots = recordedShots;
      return {
        ...frame,
        artifacts: lastArtifacts,
        shots: lastShots,
      };
    });
    physicsRecordingFrames.current = null;
    physicsRecordingArtifacts.current = new Map();
    physicsRecordingShots.current = new Map();
    setFrames(nextFrames);
    return nextFrames;
  };

  const playFrames = (frameList: TelemetryFrame[], startIndex: number, recordPhysics = false) => {
    if (timer.current) clearInterval(timer.current);
    if (recordPhysics) {
      physicsRecordingFrames.current = frameList.map((frame) => ({
        ...frame,
        artifacts: frame.artifacts ? frame.artifacts.map((artifact) => ({ ...artifact })) : undefined,
        shots: frame.shots ? frame.shots.map((shot) => ({ ...shot })) : undefined,
      }));
      physicsRecordingArtifacts.current = new Map();
      physicsRecordingShots.current = new Map();
    } else {
      physicsRecordingFrames.current = null;
      physicsRecordingArtifacts.current = new Map();
      physicsRecordingShots.current = new Map();
    }
    const lastIndex = frameList.length - 1;
    let i = Math.min(startIndex, lastIndex);

    setPlaybackId((id) => id + 1);
    setFrames(frameList);
    setIndex(i);
    setRunning(true);
    timer.current = setInterval(() => {
      i++;
      setIndex(i);
      if (i >= lastIndex) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        if (recordPhysics) commitPhysicsRecording(frameList);
        setRunning(false);
        setHasRun(true);
      }
    }, PLAYBACK_INTERVAL_MS);
  };

  const playFrom = (startIndex: number) => playFrames(frames, startIndex);

  const stopSimulation = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;

    if (physicsRecordingFrames.current) {
      const stoppedFrames = commitPhysicsRecording(frames, index);
      setIndex(Math.max(0, stoppedFrames.length - 1));
      setHasRun(true);
    }

    setRunning(false);
  };

  const recordPhysicsArtifacts = (frameIndex: number, artifacts: ArtifactPhysicsState[]) => {
    if (!physicsRecordingFrames.current) return;
    physicsRecordingArtifacts.current.set(frameIndex, artifacts.map((artifact) => ({ ...artifact })));
  };

  const recordPhysicsShots = (frameIndex: number, shots: ShotPhysicsState[]) => {
    if (!physicsRecordingFrames.current) return;
    physicsRecordingShots.current.set(frameIndex, shots.map((shot) => ({ ...shot })));
  };

  const run = () => {
    const startPose = { x: startX, y: startY, heading: startHeading };
    if (!isRobotPoseInsideField(startPose, robotWidth, robotLength)) {
      stopPlayback();
      setPlaybackId((id) => id + 1);
      setFrames([{ ...baseFrame, ...startPose, artifactCount: preloadCount, artifacts: cloneArtifactFrameState(createArtifacts(selectedArtifactRows)), warning: "Invalid start position" }]);
      setIndex(0);
      setHasRun(false);
      setAnalysis(null);
      setSetupWarning(t("invalidStartPosition"));
      return;
    }

    setRunId((id) => id + 1);
    setAnalysis(null);
    setSetupWarning("");
    setHasRun(false);
    playFrames(generateRobotCodeFrames(code, startPose, coordinateSystem, preloadCount, robotWidth, robotLength, selectedArtifactRows), 0, true);
  };

  const togglePlayback = () => {
    if (running) {
      stopSimulation();
      return;
    }
    playFrom(index >= frames.length - 1 ? 0 : index);
  };

  const seek = (nextIndex: number) => {
    stopPlayback();
    setPlaybackId((id) => id + 1);
    setIndex(nextIndex);
  };

  const requestAIFeedback = () => {
    if (running || !hasRun || analyzing) return;

    const selectedRobot = robotPresets.find((robot) => robot.id === robotId);
    if (!selectedRobot) {
      setSetupWarning(t("robotConfigurationMissing"));
      return;
    }

    const runAnalysis = async () => {
      setAnalyzing(true);
      setSetupWarning("");

      try {
        const recentFrames = frames.slice(-180);
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal,
            code,
            uiLanguage: language,
            robotSetup: {
              robotId,
              robotName: selectedRobot.name,
              width: selectedRobot.width,
              length: selectedRobot.length,
              coordinateSystem,
              startPose: { x: startX, y: startY, heading: startHeading },
              preloadCount,
              selectedArtifactRows,
            },
            telemetry: recentFrames,
          }),
        });

        const result: unknown = await response.json();

        if (!response.ok) {
          const message = typeof result === "object" && result && "error" in result && typeof result.error === "string"
            ? result.error
            : t("aiAnalysisRequestFailed");
          throw new Error(message);
        }

        if (!isAIFeedback(result)) {
          throw new Error(t("aiResponseInvalid"));
        }

        setAnalysis(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setAnalysis({
          headline: t("aiAnalysisUnavailable"),
          status: "warning",
          happened: t("aiUnavailableHappened"),
          cause: `${t("aiUnavailableCause")} ${message}`,
          evidence: [t("aiUnavailableEvidenceOne"), t("aiUnavailableEvidenceTwo")],
          fix: t("aiUnavailableFix"),
          optimization: t("aiUnavailableOptimization"),
          concept: t("aiUnavailableConcept"),
        });
      } finally {
        setAnalyzing(false);
        setTimeout(() => document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    };

    void runAnalysis();
  };

  const shootSignal = frame.shot ? (runId + 1) * 1000000 + playbackId * 10000 + frame.shot.id : -1;

  return (
    <main className="sim-shell">
      <header className="sim-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="sim-title"><span>{t("simulation")}</span><i />{robotId === "turret" ? t("turretShooter") : robotPresets.find((robot) => robot.id === robotId)?.name}</div>
        <div className="sim-nav-right"><LanguageSwitcher /><span><i className="live-dot" />{t("simulationReady")}</span><Link href="/">{t("exitLab")}</Link></div>
      </header>
      <section className={`lab-guide ${experienceLevel}`}>
        <div><span>{experienceLevel === "beginner" ? t("beginnerFirstMission") : experienceLevel === "intermediate" ? t("intermediateLab") : t("advancedLab")}</span><strong>{experienceLevel === "beginner" ? t("beginnerGuide") : experienceLevel === "intermediate" ? t("intermediateGuide") : t("advancedGuide")}</strong></div>
        <ol><li><b>1</b> {t("readGoal")}</li><li><b>2</b> {t("pressRun")}</li><li><b>3</b> {t("askAiCoach")}</li></ol>
        <Link href="/#paths">{t("changeLevel")}</Link>
      </section>
      <div className="sim-layout">
        <InputPanel
          experienceLevel={experienceLevel}
          {...{
            goal,
            setGoal,
            code,
            setCode,
            running,
            robotId,
            coordinateSystem,
            setCoordinateSystem,
            startX: displayStartPosition.x,
            startY: displayStartPosition.y,
            startHeading,
            setStartX: updateStartX,
            setStartY: updateStartY,
            setStartHeading: updateStartHeading,
            selectedArtifactRows,
            setSelectedArtifactRows,
            preloadCount,
            setPreloadCount: updatePreloadCount,
            setupWarning,
          }}
          onRobot={selectRobot}
          onRun={run}
          onStop={stopSimulation}
          onAnalyze={requestAIFeedback}
          analyzing={analyzing}
          canAnalyze={hasRun}
        />
        <div className="workspace">
          <div className="field-row">
            <FieldSimulator
              frame={frame}
              trail={frames.slice(0, index + 1)}
              running={running}
              robotId={robotId}
              coordinateSystem={coordinateSystem}
              selectedArtifactRows={selectedArtifactRows}
              recordingPhysics={running && !hasRun}
              robotWidth={robotWidth}
              robotLength={robotLength}
              shootSignal={shootSignal}
              ballResetSignal={playbackId}
              showPlayback={hasRun}
              frameIndex={index}
              totalFrames={frames.length}
              duration={frames.at(-1)?.time || 0}
              onPhysicsArtifacts={recordPhysicsArtifacts}
              onPhysicsShots={recordPhysicsShots}
              onSeek={seek}
              onTogglePlayback={togglePlayback}
            />
            <TelemetryPanel frame={frame} events={events} progress={(index / Math.max(1, frames.length - 1)) * 100} coordinateSystem={coordinateSystem} />
          </div>
          {(hasRun || analysis) && (
            <div id="analysis">
              <AIFeedbackPanel data={analysis} goal={goal} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
