"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIFeedback, AIChatMessage, AllianceColor, AnalyzeResponse, ArtifactPhysicsState, ArtifactRowId, ControlMode, CoordinateSystem, DecodeRuleViolation, DecodeTelemetryMetrics, ScoreBreakdown, ShotPhysicsState, TelemetryFrame } from "@/lib/types";
import { AIFeedbackPanel } from "@/components/AIFeedbackPanel";
import { FieldSimulator } from "@/components/FieldSimulator";
import { InputPanel } from "@/components/InputPanel";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { robotPresets, RobotPresetId } from "@/lib/robots";
import { selectAnalysisFrames } from "@/lib/analysis";

type StartPose = { x: number; y: number; heading: number };
type ArtifactSpec = { id: string; row: ArtifactRowId; x: number; y: number; color: "green" | "purple" };
type SimArtifact = ArtifactPhysicsState & { vx: number; vy: number };
type TeleopRuntime = {
  pose: StartPose;
  time: number;
  leftEncoder: number;
  rightEncoder: number;
  artifactCount: number;
  shotId: number;
  artifacts: SimArtifact[];
};
type RobotCommand =
  | { type: "drive"; direction: "forward" | "backward" | "left" | "right"; distance: number }
  | { type: "driveTo"; x: number; y: number; heading?: number }
  | { type: "turn"; heading: number }
  | { type: "spinFlywheel"; rpm: number }
  | { type: "shoot"; angle: number }
  | { type: "intake"; mode: "in" | "out" | "off" }
  | { type: "wait"; seconds: number };

const defaultGoal = "Test robot code on the DECODE field.";
const defaultCode = `driveToPosition(72, 90, 145);
spinFlywheel(2400);
shoot(60);`;
const defaultTeleopCode = `// TeleOp controls
// W/S: drive forward and backward
// A/D: strafe left and right
// Arrow Left/Right: turn heading
// Z: hold to run intake in
// Space: fire one loaded artifact`;
const defaultStartPose: StartPose = { x: 72, y: 72, heading: 90 };
const defaultPreloadCount = 1;
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
const CLASSIFIED_CAPACITY = 9;
const ARTIFACT_RADIUS_INCHES = 2.5;
const ARTIFACT_WALL_CLEARANCE_INCHES = 3.25;
const ARTIFACT_RESTITUTION = 0.32;
const ARTIFACT_FRICTION_PER_SECOND = 4.2;
const ARTIFACT_MAX_SPEED_INCHES_PER_SECOND = 96;
const ROBOT_PUSH_MAX_SPEED_INCHES_PER_SECOND = 72;
const AUTO_DRIVE_SPEED_INCHES_PER_SECOND = 36;
const AUTO_TURN_DEGREES_PER_SECOND = 270;
const TELEOP_DRIVE_SPEED_INCHES_PER_SECOND = 54;
const TELEOP_TURN_DEGREES_PER_SECOND = 180;
const TELEOP_SHOT_RPM = 2400;
const TELEOP_SHOT_ANGLE = 60;
const AUTONOMOUS_PERIOD_SECONDS = 30;
const DECODE_ARTIFACT_SCORE_POINTS = 10;
const DECODE_SHOT_MIN_SPEED = 6.2;
const DECODE_SHOT_MIN_ANGLE = 32;
const DECODE_SHOT_MAX_ANGLE = 58;
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
  score: { shotsMade: 0, totalPoints: 0, classifiedShots: 0, overflowShots: 0, wrongGoalShots: 0 },
  decodeTelemetry: {
    phase: "autonomous",
    autonomousScoringTotal: 0,
    teleOpScoringTotal: 0,
    artifactCount: {
      preloaded: 0,
      collected: 0,
      stored: 0,
      fired: 0,
      controlled: 0,
    },
    shotSuccessRate: {
      successful: 0,
      attempted: 0,
      percent: 0,
    },
    flywheelEfficiency: {
      targetRpm: 0,
      actualRpm: 0,
      rpmError: 0,
      percent: 100,
    },
    robotVelocity: {
      linearSpeedInchesPerSecond: 0,
      speedVariance: 0,
      averageDrivePower: 0,
    },
    ruleViolations: [],
  },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smootherStep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalizeHeading = (value: number) => {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};
const emptyScore = (): ScoreBreakdown => ({ shotsMade: 0, totalPoints: 0, classifiedShots: 0, overflowShots: 0, wrongGoalShots: 0 });
const cloneScore = (score: ScoreBreakdown): ScoreBreakdown => ({ ...score });
type ShotFieldPosition = { x: number; y: number; height: number };
type ClassifierZone = {
  goal: AllianceColor;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minHeight: number;
  maxHeight: number;
};
type ClassifierEntryPlane = {
  goal: AllianceColor;
  planeX: number;
  direction: "decreasingX" | "increasingX";
  minY: number;
  maxY: number;
  minHeight: number;
  maxHeight: number;
};
const classifierEntryPlanes: ClassifierEntryPlane[] = [
  { goal: "blue", planeX: 30, direction: "decreasingX", minY: 70, maxY: 138, minHeight: 0.12, maxHeight: 1.65 },
  { goal: "red", planeX: 114, direction: "increasingX", minY: 70, maxY: 138, minHeight: 0.12, maxHeight: 1.65 },
];
const classifierZones: ClassifierZone[] = [
  { goal: "blue", minX: 0, maxX: 30, minY: 70, maxY: 138, minHeight: 0.05, maxHeight: 1.65 },
  { goal: "red", minX: 114, maxX: 144, minY: 70, maxY: 138, minHeight: 0.05, maxHeight: 1.65 },
];
const shotFieldPosition = (shot: ShotPhysicsState): ShotFieldPosition => ({
    x: shot.x / 0.0254 + FIELD_SIZE_INCHES / 2,
    y: shot.z / 0.0254 + FIELD_SIZE_INCHES / 2,
    height: shot.y,
});
const positionInClassifierZone = (position: ShotFieldPosition, zone: ClassifierZone) => (
  position.x >= zone.minX &&
  position.x <= zone.maxX &&
  position.y >= zone.minY &&
  position.y <= zone.maxY &&
  position.height >= zone.minHeight &&
  position.height <= zone.maxHeight
);
const segmentIntersectsClassifierZone = (previous: ShotFieldPosition, current: ShotFieldPosition, zone: ClassifierZone) => {
  if (positionInClassifierZone(previous, zone) || positionInClassifierZone(current, zone)) return true;

  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (positionInClassifierZone({
      x: lerp(previous.x, current.x, t),
      y: lerp(previous.y, current.y, t),
      height: lerp(previous.height, current.height, t),
    }, zone)) return true;
  }

  return false;
};
const segmentCrossesClassifierEntry = (previous: ShotFieldPosition, current: ShotFieldPosition, plane: ClassifierEntryPlane) => {
  const dx = current.x - previous.x;
  if (Math.abs(dx) < 0.001) return false;
  if (plane.direction === "decreasingX" && !(previous.x > plane.planeX && current.x <= plane.planeX)) return false;
  if (plane.direction === "increasingX" && !(previous.x < plane.planeX && current.x >= plane.planeX)) return false;

  const t = (plane.planeX - previous.x) / dx;
  if (t < 0 || t > 1) return false;
  const y = lerp(previous.y, current.y, t);
  const height = lerp(previous.height, current.height, t);
  return y >= plane.minY
    && y <= plane.maxY
    && height >= plane.minHeight
    && height <= plane.maxHeight;
};
const classifierGoalForShot = (shot: ShotPhysicsState, previous?: ShotFieldPosition[]): AllianceColor | null => {
  const position = shotFieldPosition(shot);
  if (previous?.[0]) {
    for (const plane of classifierEntryPlanes) {
      if (segmentCrossesClassifierEntry(previous[0], position, plane)) return plane.goal;
    }
  }

  for (const zone of classifierZones) {
    if (previous?.[0] ? segmentIntersectsClassifierZone(previous[0], position, zone) : positionInClassifierZone(position, zone)) return zone.goal;
  }

  return null;
};
const applyScoringToFrames = (recorded: TelemetryFrame[], allianceColor: AllianceColor): TelemetryFrame[] => {
  const score = emptyScore();
  const scoredShots = new Set<number>();
  const lastShotPositions = new Map<number, ShotFieldPosition[]>();

  return recorded.map((frame) => {
    let frameScoreEvent: TelemetryFrame["scoreEvent"];
    let event = frame.event;
    let warning = frame.warning;

    for (const shot of frame.shots ?? []) {
      const previousPositions = lastShotPositions.get(shot.id);
      const goal = scoredShots.has(shot.id) ? null : classifierGoalForShot(shot, previousPositions);
      lastShotPositions.set(shot.id, [shotFieldPosition(shot)]);
      if (!goal) continue;

      scoredShots.add(shot.id);
      if (goal !== allianceColor) {
        score.wrongGoalShots += 1;
        frameScoreEvent = { shotId: shot.id, goal, result: "wrongGoal", points: 0 };
        warning = `Wrong goal: shot ${shot.id} passed through ${goal} classifier`;
      } else {
        score.shotsMade += 1;
        if (score.classifiedShots < CLASSIFIED_CAPACITY) {
          score.classifiedShots += 1;
          score.totalPoints += 3;
          frameScoreEvent = { shotId: shot.id, goal, result: "classified", points: 3 };
          event = event ? `${event}; Classified shot ${shot.id} +3` : `Classified shot ${shot.id} +3`;
        } else {
          score.overflowShots += 1;
          score.totalPoints += 1;
          frameScoreEvent = { shotId: shot.id, goal, result: "overflow", points: 1 };
          event = event ? `${event}; Overflow shot ${shot.id} +1` : `Overflow shot ${shot.id} +1`;
        }
      }
    }

    return {
      ...frame,
      event,
      warning,
      score: cloneScore(score),
      scoreEvent: frameScoreEvent ?? frame.scoreEvent,
    };
  });
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

  const rawRobotVx = (robot.x - previousRobot.x) / dt;
  const rawRobotVy = (robot.y - previousRobot.y) / dt;
  const robotSpeed = Math.hypot(rawRobotVx, rawRobotVy);
  const robotVelocityScale = robotSpeed > ROBOT_PUSH_MAX_SPEED_INCHES_PER_SECOND ? ROBOT_PUSH_MAX_SPEED_INCHES_PER_SECOND / robotSpeed : 1;
  const robotVx = rawRobotVx * robotVelocityScale;
  const robotVy = rawRobotVy * robotVelocityScale;
  const normalVelocity = (artifact.vx - robotVx) * nx + (artifact.vy - robotVy) * ny;
  if (normalVelocity < 0) {
    const impulse = -(1 + ARTIFACT_RESTITUTION) * normalVelocity;
    artifact.vx += nx * impulse;
    artifact.vy += ny * impulse;
  }
  artifact.vx += robotVx * 0.22;
  artifact.vy += robotVy * 0.22;
  const artifactSpeed = Math.hypot(artifact.vx, artifact.vy);
  if (artifactSpeed > ARTIFACT_MAX_SPEED_INCHES_PER_SECOND) {
    const scale = ARTIFACT_MAX_SPEED_INCHES_PER_SECOND / artifactSpeed;
    artifact.vx *= scale;
    artifact.vy *= scale;
  }
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
      if (name === "turn") return { type: "turn", heading: normalizeHeading(first || 0) } satisfies RobotCommand;
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

function isDecodeShotSuccessful(speed: number, angle: number, targetRpm: number, actualRpm: number) {
  return speed >= DECODE_SHOT_MIN_SPEED
    && angle >= DECODE_SHOT_MIN_ANGLE
    && angle <= DECODE_SHOT_MAX_ANGLE
    && targetRpm > 0
    && actualRpm >= targetRpm * 0.92;
}

function createDecodeTelemetryMetrics({
  time,
  autonomousScoringTotal,
  teleOpScoringTotal,
  preloaded,
  collected,
  stored,
  fired,
  successfulShots,
  attemptedShots,
  shooterTarget,
  shooterRpm,
  linearSpeed,
  speedSamples,
  leftPower,
  rightPower,
  ruleViolations,
}: {
  time: number;
  autonomousScoringTotal: number;
  teleOpScoringTotal: number;
  preloaded: number;
  collected: number;
  stored: number;
  fired: number;
  successfulShots: number;
  attemptedShots: number;
  shooterTarget: number;
  shooterRpm: number;
  linearSpeed: number;
  speedSamples: number[];
  leftPower: number;
  rightPower: number;
  ruleViolations: DecodeRuleViolation[];
}): DecodeTelemetryMetrics {
  const averageSpeed = speedSamples.length ? speedSamples.reduce((sum, speed) => sum + speed, 0) / speedSamples.length : 0;
  const speedVariance = speedSamples.length
    ? speedSamples.reduce((sum, speed) => sum + (speed - averageSpeed) ** 2, 0) / speedSamples.length
    : 0;
  const rpmError = shooterTarget > 0 ? Math.abs(shooterTarget - shooterRpm) : 0;

  return {
    phase: time <= AUTONOMOUS_PERIOD_SECONDS ? "autonomous" : "teleop",
    autonomousScoringTotal,
    teleOpScoringTotal,
    artifactCount: {
      preloaded,
      collected,
      stored,
      fired,
      controlled: stored,
    },
    shotSuccessRate: {
      successful: successfulShots,
      attempted: attemptedShots,
      percent: attemptedShots > 0 ? Math.round(successfulShots / attemptedShots * 100) : 0,
    },
    flywheelEfficiency: {
      targetRpm: shooterTarget,
      actualRpm: shooterRpm,
      rpmError,
      percent: shooterTarget > 0 ? Math.round(clamp(shooterRpm / shooterTarget, 0, 1) * 100) : 100,
    },
    robotVelocity: {
      linearSpeedInchesPerSecond: linearSpeed,
      speedVariance,
      averageDrivePower: (Math.abs(leftPower) + Math.abs(rightPower)) / 2,
    },
    ruleViolations,
  };
}

function createSetupFrame(
  pose: StartPose,
  preloadCount: number,
  selectedRows: ArtifactRowId[],
  status: Pick<TelemetryFrame, "event" | "warning"> = { event: "Ready" },
  ruleViolations: DecodeRuleViolation[] = [],
): TelemetryFrame {
  const safePreloadCount = Math.round(clamp(preloadCount, 0, 3));

  return {
    ...baseFrame,
    ...pose,
    artifactCount: safePreloadCount,
    artifacts: cloneArtifactFrameState(createArtifacts(selectedRows)),
    score: emptyScore(),
    decodeTelemetry: createDecodeTelemetryMetrics({
      time: 0,
      autonomousScoringTotal: 0,
      teleOpScoringTotal: 0,
      preloaded: safePreloadCount,
      collected: 0,
      stored: safePreloadCount,
      fired: 0,
      successfulShots: 0,
      attemptedShots: 0,
      shooterTarget: 0,
      shooterRpm: 0,
      linearSpeed: 0,
      speedSamples: [],
      leftPower: 0,
      rightPower: 0,
      ruleViolations,
    }),
    ...status,
  };
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
  let current = { ...startPose };
  let time = 0;
  let leftEncoder = 0;
  let rightEncoder = 0;
  let shooterTarget = 0;
  let shooterRpm = 0;
  let intake: TelemetryFrame["intake"] = "off";
  let artifactCount = safePreloadCount;
  let shotId = 0;
  let collectedArtifacts = 0;
  let firedArtifacts = 0;
  let successfulShots = 0;
  let autonomousScoringTotal = 0;
  let teleOpScoringTotal = 0;
  let lastTelemetryPose = { ...startPose };
  let lastTelemetryTime = 0;
  const shots: { time: number; speed: number; angle: number }[] = [];
  const blockedIntakeArtifacts = new Set<string>();
  const speedSamples: number[] = [];
  const ruleViolations: DecodeRuleViolation[] = [];
  const frames: TelemetryFrame[] = [];

  const addRuleViolation = (code: DecodeRuleViolation["code"], message: string, severity: DecodeRuleViolation["severity"] = "warning") => {
    ruleViolations.push({ code, severity, message, time });
  };

  const pushFrame = (overrides: Partial<TelemetryFrame> = {}) => {
    const leftPowerValue = overrides.leftPower ?? 0;
    const rightPowerValue = overrides.rightPower ?? 0;
    const dt = Math.max(time - lastTelemetryTime, SIMULATION_FRAME_SECONDS);
    const linearSpeed = Math.hypot(current.x - lastTelemetryPose.x, current.y - lastTelemetryPose.y) / dt;
    if (linearSpeed > 0 || leftPowerValue !== 0 || rightPowerValue !== 0) speedSamples.push(linearSpeed);
    lastTelemetryPose = { ...current };
    lastTelemetryTime = time;

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
      decodeTelemetry: createDecodeTelemetryMetrics({
        time,
        autonomousScoringTotal,
        teleOpScoringTotal,
        preloaded: safePreloadCount,
        collected: collectedArtifacts,
        stored: artifactCount,
        fired: firedArtifacts,
        successfulShots,
        attemptedShots: shotId,
        shooterTarget,
        shooterRpm,
        linearSpeed,
        speedSamples,
        leftPower: leftPowerValue,
        rightPower: rightPowerValue,
        ruleViolations: [...ruleViolations],
      }),
      ...overrides,
    });
  };
  pushFrame({ event: "Ready" });

  const stepPhysicsTo = (nextPose: StartPose, dt: number) => {
    const previous = current;
    current = constrainRobotPose(nextPose, robotWidth, robotLength);
    collectIntakeContact();
    stepArtifactPhysics(artifacts, current, previous, robotWidth, robotLength, dt);
    collectIntakeContact();
  };

  const collectIntakeContact = () => {
    if (intake !== "in") return "";
    const headingRadians = current.heading * THREE_DEGREES_TO_RADIANS;
    const forward = { x: Math.cos(headingRadians), y: -Math.sin(headingRadians) };
    const right = { x: Math.sin(headingRadians), y: Math.cos(headingRadians) };
    const frontMin = robotLength / 2 - ARTIFACT_RADIUS_INCHES * 1.35;
    const frontMax = robotLength / 2 + ARTIFACT_RADIUS_INCHES * 2.75;
    const sideLimit = robotWidth / 2 + ARTIFACT_RADIUS_INCHES * 1.25;
    const contactIndex = artifacts.findIndex((artifact) => {
      const dx = artifact.x - current.x;
      const dy = artifact.y - current.y;
      const localForward = dx * forward.x + dy * forward.y;
      const localRight = dx * right.x + dy * right.y;
      return localForward >= frontMin && localForward <= frontMax && Math.abs(localRight) <= sideLimit;
    });
    if (contactIndex < 0) return "";

    const artifact = artifacts[contactIndex];
    if (artifactCount < 3) {
      artifactCount += 1;
      collectedArtifacts += 1;
      artifacts.splice(contactIndex, 1);
      blockedIntakeArtifacts.delete(artifact.id);
      return `collected artifact ${artifactCount}`;
    }

    artifact.vx += forward.x * 22;
    artifact.vy += forward.y * 22;
    if (blockedIntakeArtifacts.has(artifact.id)) return "";
    blockedIntakeArtifacts.add(artifact.id);
    addRuleViolation("ARTIFACT_CONTROL", "Robot attempted to control more than 3 artifacts.", "major");
    return "controlled 4 artifacts";
  };
  const releaseStoredArtifacts = () => {
    if (artifactCount <= 0) return "";
    const released = artifactCount;
    const headingRadians = current.heading * THREE_DEGREES_TO_RADIANS;
    const forward = { x: Math.cos(headingRadians), y: -Math.sin(headingRadians) };
    const right = { x: Math.sin(headingRadians), y: Math.cos(headingRadians) };
    const offsets = released === 1 ? [0] : released === 2 ? [-3.2, 3.2] : [-5.5, 0, 5.5];

    offsets.forEach((offset, releaseIndex) => {
      const x = clamp(current.x + forward.x * (robotLength / 2 + ARTIFACT_RADIUS_INCHES + 1) + right.x * offset, ARTIFACT_RADIUS_INCHES, FIELD_SIZE_INCHES - ARTIFACT_RADIUS_INCHES);
      const y = clamp(current.y + forward.y * (robotLength / 2 + ARTIFACT_RADIUS_INCHES + 1) + right.y * offset, ARTIFACT_RADIUS_INCHES, FIELD_SIZE_INCHES - ARTIFACT_RADIUS_INCHES);
      artifacts.push({
        id: `released-${frames.length}-${releaseIndex}`,
        row: "topLoading",
        x,
        y,
        color: releaseIndex % 2 === 0 ? "purple" : "green",
        roll: 0,
        vx: forward.x * 14,
        vy: forward.y * 14,
      });
    });
    artifactCount = 0;
    return `released ${released} artifact${released === 1 ? "" : "s"}`;
  };

  const advanceWait = (seconds: number, event?: string) => {
    const steps = Math.max(1, Math.ceil(seconds / SIMULATION_FRAME_SECONDS));
    for (let i = 1; i <= steps; i++) {
      const dt = seconds / steps;
      time += dt;
      stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, dt);
      const intakeEvent = collectIntakeContact();
      const frameEvent = [i === 1 ? event : "", intakeEvent].filter(Boolean).join("; ");
      pushFrame({
        leftPower: 0,
        rightPower: 0,
        feeder: false,
        event: frameEvent,
        warning: intakeEvent === "controlled 4 artifacts" ? "controlled 4 artifacts" : undefined,
      });
    }
  };

  const advanceDrive = (target: StartPose, event: string, gradualHeading: boolean) => {
    const start = { ...current };
    const distance = Math.hypot(target.x - start.x, target.y - start.y);
    const turnTime = gradualHeading ? Math.abs(headingDelta(start.heading, target.heading)) / AUTO_TURN_DEGREES_PER_SECOND : 0;
    const totalTime = Math.max(0.23, distance / AUTO_DRIVE_SPEED_INCHES_PER_SECOND, turnTime);
    const steps = Math.max(4, Math.ceil(totalTime / SIMULATION_FRAME_SECONDS));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const motionT = smootherStep(t);
      const dt = totalTime / steps;
      time += dt;
      leftEncoder += distance * 5.8 / steps;
      rightEncoder += distance * 5.8 / steps;
      stepPhysicsTo({
        x: lerp(start.x, target.x, motionT),
        y: lerp(start.y, target.y, motionT),
        heading: gradualHeading ? lerpHeading(start.heading, target.heading, motionT) : start.heading,
      }, dt);
      const contactEvent = collectIntakeContact();
      pushFrame({
        leftPower: 0.48,
        rightPower: 0.48,
        feeder: false,
        event: [i === 1 ? event : "", contactEvent].filter(Boolean).join("; "),
        warning: contactEvent === "controlled 4 artifacts" ? "controlled 4 artifacts" : undefined,
      });
    }

    current = constrainRobotPose(target, robotWidth, robotLength);
  };

  const advanceTurn = (heading: number) => {
    const start = { ...current };
    const delta = headingDelta(start.heading, heading);
    const totalTime = Math.max(0.17, Math.abs(delta) / AUTO_TURN_DEGREES_PER_SECOND);
    const steps = Math.max(3, Math.ceil(totalTime / SIMULATION_FRAME_SECONDS));

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const motionT = smootherStep(t);
      const dt = totalTime / steps;
      time += dt;
      const turnProgress = Math.abs(delta) / steps;
      leftEncoder -= turnProgress * 2.1;
      rightEncoder += turnProgress * 2.1;
      stepPhysicsTo({
        ...start,
        heading: lerpHeading(start.heading, heading, motionT),
      }, dt);
      const contactEvent = collectIntakeContact();
      pushFrame({
        leftPower: delta >= 0 ? -0.36 : 0.36,
        rightPower: delta >= 0 ? 0.36 : -0.36,
        feeder: false,
        event: [i === 1 ? `turn ${heading.toFixed(0)} deg` : "", contactEvent].filter(Boolean).join("; "),
        warning: contactEvent === "controlled 4 artifacts" ? "controlled 4 artifacts" : undefined,
      });
    }

    current = { ...current, heading };
  };

  if (commands.length === 0) {
    time = 0.1;
    addRuleViolation("CONTROL_LIMIT", "No supported robot code actions were parsed.");
    pushFrame({ warning: "No supported robot code actions parsed" });
    return frames;
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
      if (Math.abs(safeTarget.x - target.x) > 0.001 || Math.abs(safeTarget.y - target.y) > 0.001) {
        addRuleViolation("FIELD_BOUNDARY", `Drive command was clamped to keep the ${robotWidth} x ${robotLength} in robot inside the field.`);
      }
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
      if (Math.abs(target.x - targetPosition.x) > 0.001 || Math.abs(target.y - targetPosition.y) > 0.001) {
        addRuleViolation("FIELD_BOUNDARY", `driveToPosition target was clamped to remain inside the DECODE field.`);
      }
      advanceDrive(
        target,
        hasHeading ? `driveToPosition ${command.x}, ${command.y}, ${command.heading}` : `driveToPosition ${command.x}, ${command.y}`,
        hasHeading,
      );
    }

    if (command.type === "turn") {
      advanceTurn(command.heading);
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
        addRuleViolation("CONTROL_LIMIT", "Shoot command ran without a loaded artifact.");
        pushFrame({
          feeder: false,
          event: `Shoot ${command.angle.toFixed(0)} deg`,
          warning: "No artifact loaded to shoot",
        });
        continue;
      }

      shotId += 1;
      artifactCount -= 1;
      firedArtifacts += 1;
      const shotSpeed = Math.max(0.5, shooterRpm / 3600 * 8);
      const scored = isDecodeShotSuccessful(shotSpeed, command.angle, shooterTarget, shooterRpm);
      if (scored) {
        successfulShots += 1;
        if (time <= AUTONOMOUS_PERIOD_SECONDS) autonomousScoringTotal += DECODE_ARTIFACT_SCORE_POINTS;
        else teleOpScoringTotal += DECODE_ARTIFACT_SCORE_POINTS;
      }
      time += SIMULATION_FRAME_SECONDS;
      stepArtifactPhysics(artifacts, current, current, robotWidth, robotLength, SIMULATION_FRAME_SECONDS);
      shots.push({ time, speed: shotSpeed, angle: command.angle });
      pushFrame({
        feeder: true,
        event: scored ? `Shoot ${command.angle.toFixed(0)} deg; scored artifact` : `Shoot ${command.angle.toFixed(0)} deg; missed trajectory`,
        shot: { id: shotId, speed: shotSpeed, angle: command.angle },
      });
      advanceWait(0.2);
    }

    if (command.type === "intake") {
      intake = command.mode;
      const releaseEvent = command.mode === "out" ? releaseStoredArtifacts() : "";
      advanceWait(0.2, [command.mode === "in" ? "intakeSpinIn" : command.mode === "out" ? "intakeSpinOut" : "intakeStopSpin", releaseEvent].filter(Boolean).join("; "));
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

const analysisUnavailableFeedback: AIFeedback = {
  headline: "AI analysis unavailable",
  status: "warning",
  happened: "The simulator produced telemetry, but the analysis request did not complete.",
  cause: "The local analysis route or external AI provider returned an error.",
  evidence: ["Telemetry frames were generated locally", "The analysis request failed before returning a usable response"],
  fix: "Try running analysis again after the dev server finishes compiling. If it keeps failing, check the browser console and API route logs.",
  optimization: "The simulator data is still available in the scoring and telemetry panels.",
  concept: "Simulation playback and AI analysis are separate layers, so a temporary AI failure should not invalidate the recorded run.",
};

function ScorePanel({ frame }: { frame: TelemetryFrame }) {
  const score = frame.score ?? emptyScore();

  return (
    <section className="score-panel panel clean-telemetry">
      <div className="tool-panel-head">
        <div>
          <h2>Scoring</h2>
          <p>Goal and classifier tracking</p>
        </div>
      </div>
      <div className="score-grid">
        <div className="score-stat score-stat-primary">
          <span>Goals</span>
          <strong>{score.shotsMade}</strong>
        </div>
        <div className="score-stat score-stat-primary">
          <span>Total points</span>
          <strong>{score.totalPoints}</strong>
        </div>
        <div className="score-stat">
          <span>Classified</span>
          <strong>{score.classifiedShots}</strong>
          <small>3 pts each</small>
        </div>
        <div className="score-stat">
          <span>Overflow</span>
          <strong>{score.overflowShots}</strong>
          <small>1 pt each</small>
        </div>
      </div>
      {score.wrongGoalShots > 0 && <p className="score-warning">{score.wrongGoalShots} wrong-goal shot{score.wrongGoalShots === 1 ? "" : "s"} logged</p>}
    </section>
  );
}

export default function SimulatorDashboard() {
  const [goal, setGoal] = useState(defaultGoal);
  const [controlMode, setControlModeState] = useState<ControlMode>("autonomous");
  const [autonomousCode, setAutonomousCode] = useState(defaultCode);
  const [teleopCode, setTeleopCode] = useState(defaultTeleopCode);
  const [robotId, setRobotId] = useState<RobotPresetId>("turret");
  const [allianceColor, setAllianceColor] = useState<AllianceColor>("blue");
  const [coordinateSystem, setCoordinateSystem] = useState<CoordinateSystem>("corner");
  const [selectedArtifactRows, setSelectedArtifactRows] = useState<ArtifactRowId[]>(defaultArtifactRows);
  const [preloadCount, setPreloadCount] = useState(defaultPreloadCount);
  const [startX, setStartX] = useState(defaultStartPose.x);
  const [startY, setStartY] = useState(defaultStartPose.y);
  const [startHeading, setStartHeading] = useState(defaultStartPose.heading);
  const [robotWidth, setRobotWidth] = useState(17);
  const [robotLength, setRobotLength] = useState(17);
  const [frames, setFrames] = useState<TelemetryFrame[]>(() => generateRobotCodeFrames(defaultCode, defaultStartPose, "corner", defaultPreloadCount, 17, 17, defaultArtifactRows));
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [runId, setRunId] = useState(0);
  const [playbackId, setPlaybackId] = useState(0);
  const [analysis, setAnalysis] = useState<AIFeedback | null>(null);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [setupWarning, setSetupWarning] = useState("");
  const [liveScore, setLiveScore] = useState<ScoreBreakdown>(emptyScore());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const teleopKeys = useRef<Set<string>>(new Set());
  const teleopRuntime = useRef<TeleopRuntime | null>(null);
  const liveScoreRef = useRef<ScoreBreakdown>(emptyScore());
  const physicsRecordingFrames = useRef<TelemetryFrame[] | null>(null);
  const physicsRecordingArtifacts = useRef<Map<number, ArtifactPhysicsState[]>>(new Map());
  const physicsCollectedArtifacts = useRef<Set<string>>(new Set());
  const physicsRecordingShots = useRef<Map<number, ShotPhysicsState[]>>(new Map());
  const lastAutoAnalysisRun = useRef<number | null>(null);

  const code = controlMode === "autonomous" ? autonomousCode : teleopCode;
  const setCode = controlMode === "autonomous" ? setAutonomousCode : setTeleopCode;
  const frame = frames[index] || frames[0];
  const frameScore = frame?.score ?? emptyScore();
  const displayFrame = running && liveScore.totalPoints > frameScore.totalPoints ? { ...frame, score: liveScore } : frame;
  const events = frames.slice(0, index + 1).filter((item) => item.event || item.warning);
  const displayStartPosition = displayPositionFromField({ x: startX, y: startY, heading: startHeading }, coordinateSystem);
  const resetLiveScore = () => {
    const next = emptyScore();
    liveScoreRef.current = next;
    setLiveScore(next);
  };
  const cloneFrameForRecording = (item: TelemetryFrame): TelemetryFrame => ({
    ...item,
    artifacts: item.artifacts ? item.artifacts.map((artifact) => ({ ...artifact })) : undefined,
    shots: item.shots ? item.shots.map((shot) => ({ ...shot })) : undefined,
    score: item.score ? cloneScore(item.score) : undefined,
    shot: item.shot ? { ...item.shot } : undefined,
    scoreEvent: item.scoreEvent ? { ...item.scoreEvent } : undefined,
  });
  const appendTeleopFrame = (nextFrame: TelemetryFrame) => {
    const scoredFrame = liveScoreRef.current.totalPoints > (nextFrame.score?.totalPoints ?? 0)
      ? { ...nextFrame, score: cloneScore(liveScoreRef.current) }
      : nextFrame;
    if (physicsRecordingFrames.current) physicsRecordingFrames.current.push(cloneFrameForRecording(scoredFrame));
    setFrames((previous) => {
      const next = [...previous, scoredFrame];
      setIndex(next.length - 1);
      return next;
    });
  };

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

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
    teleopKeys.current.clear();
    teleopRuntime.current = null;
    setRunning(false);
  };

  const previewStartPose = (pose: StartPose) => {
    stopPlayback();
    setPlaybackId((id) => id + 1);
    setFrames([createSetupFrame(pose, preloadCount, selectedArtifactRows)]);
    setIndex(0);
    setHasRun(false);
    setAnalysis(null);
    setChatMessages([]);
    setSetupWarning("");
    resetLiveScore();
  };

  const updatePreloadCount = (value: number) => {
    const next = Math.round(clamp(value, 0, 3));
    setPreloadCount(next);
    stopPlayback();
    setPlaybackId((id) => id + 1);
    setFrames([createSetupFrame({ x: startX, y: startY, heading: startHeading }, next, selectedArtifactRows)]);
    setIndex(0);
    setHasRun(false);
    setAnalysis(null);
    setChatMessages([]);
    setSetupWarning("");
    resetLiveScore();
  };

  const updateAllianceColor = (value: AllianceColor) => {
    setAllianceColor(value);
    stopPlayback();
    setPlaybackId((id) => id + 1);
    setFrames([createSetupFrame({ x: startX, y: startY, heading: startHeading }, preloadCount, selectedArtifactRows)]);
    setIndex(0);
    setHasRun(false);
    setAnalysis(null);
    setChatMessages([]);
    setSetupWarning("");
    resetLiveScore();
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
    const scoredFrames = applyScoringToFrames(nextFrames, allianceColor);
    physicsRecordingFrames.current = null;
    physicsRecordingArtifacts.current = new Map();
    physicsCollectedArtifacts.current = new Set();
    physicsRecordingShots.current = new Map();
    setFrames(scoredFrames);
    return scoredFrames;
  };

  const playFrames = (frameList: TelemetryFrame[], startIndex: number, recordPhysics = false) => {
    if (timer.current) clearInterval(timer.current);
    teleopKeys.current.clear();
    teleopRuntime.current = null;
    if (recordPhysics) {
      physicsRecordingFrames.current = frameList.map(cloneFrameForRecording);
      physicsRecordingArtifacts.current = new Map();
      physicsCollectedArtifacts.current = new Set();
      physicsRecordingShots.current = new Map();
    } else {
      physicsRecordingFrames.current = null;
      physicsRecordingArtifacts.current = new Map();
      physicsCollectedArtifacts.current = new Set();
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

    teleopKeys.current.clear();
    teleopRuntime.current = null;
    setRunning(false);
  };

  const recordPhysicsArtifacts = (frameIndex: number, artifacts: ArtifactPhysicsState[]) => {
    if (!physicsRecordingFrames.current) return;
    physicsRecordingArtifacts.current.set(frameIndex, artifacts.map((artifact) => ({ ...artifact })));
  };

  const repairFramesAfterIntakeCollection = (sourceFrames: TelemetryFrame[], frameIndex: number, collectedCount: number) => {
    if (collectedCount <= 0) return sourceFrames;
    const nextFrames = sourceFrames.map(cloneFrameForRecording);
    let carriedCount = Math.min(3, (nextFrames[Math.max(0, frameIndex - 1)]?.artifactCount ?? nextFrames[frameIndex]?.artifactCount ?? 0) + collectedCount);
    let nextShotId = nextFrames.reduce((highest, item) => Math.max(highest, item.shot?.id ?? 0), 0) + 1;

    for (let i = frameIndex; i < nextFrames.length; i++) {
      const frame = nextFrames[i];
      const shootAngle = Number(frame.event?.match(/shoot\s+(\d+(?:\.\d+)?)/i)?.[1]);
      const isBlockedShoot = frame.warning === "No artifact loaded to shoot" && Number.isFinite(shootAngle);
      const isShootFrame = Boolean(frame.shot) || isBlockedShoot;

      if (isShootFrame) {
        if (carriedCount > 0) {
          carriedCount -= 1;
          nextFrames[i] = {
            ...frame,
            artifactCount: carriedCount,
            feeder: true,
            warning: undefined,
            shot: frame.shot ?? {
              id: nextShotId++,
              speed: Math.max(0.5, frame.shooterRpm / 3600 * 8),
              angle: clamp(shootAngle, 20, 70),
            },
          };
        } else {
          nextFrames[i] = { ...frame, artifactCount: 0 };
        }
        continue;
      }

      nextFrames[i] = { ...frame, artifactCount: carriedCount };
      if (frame.event?.includes("released ") || frame.intake === "out") carriedCount = 0;
    }

    return nextFrames;
  };

  const removeCollectedShots = (sourceFrames: TelemetryFrame[], frameIndex: number, shotIds: number[]) => {
    if (shotIds.length === 0) return sourceFrames;
    const collectedShotIds = new Set(shotIds);
    return sourceFrames.map((frame, index) => (
      index < frameIndex || !frame.shots
        ? frame
        : {
          ...frame,
          shots: frame.shots.filter((shot) => !collectedShotIds.has(shot.id)),
        }
    ));
  };

  const recordPhysicsArtifactCollected = (frameIndex: number, artifactIds: string[]) => {
    if (!physicsRecordingFrames.current) return;
    const newArtifactIds = artifactIds.filter((id) => !physicsCollectedArtifacts.current.has(id));
    if (newArtifactIds.length === 0) return;
    const collectedShotIds = newArtifactIds
      .map((id) => id.match(/^shot-(\d+)$/)?.[1])
      .filter((id): id is string => Boolean(id))
      .map((id) => Number(id));
    newArtifactIds.forEach((id) => physicsCollectedArtifacts.current.add(id));
    if (teleopRuntime.current) {
      teleopRuntime.current.artifactCount = Math.min(3, teleopRuntime.current.artifactCount + newArtifactIds.length);
      teleopRuntime.current.artifacts = teleopRuntime.current.artifacts.filter((artifact) => !newArtifactIds.includes(artifact.id));
    }
    collectedShotIds.forEach((shotId) => {
      for (const [recordedFrameIndex, shots] of physicsRecordingShots.current) {
        if (recordedFrameIndex >= frameIndex) {
          physicsRecordingShots.current.set(recordedFrameIndex, shots.filter((shot) => shot.id !== shotId));
        }
      }
      physicsRecordingShots.current.set(frameIndex, (physicsRecordingShots.current.get(frameIndex) ?? []).filter((shot) => shot.id !== shotId));
    });
    const repairedRecording = removeCollectedShots(
      repairFramesAfterIntakeCollection(physicsRecordingFrames.current, frameIndex, newArtifactIds.length),
      frameIndex,
      collectedShotIds,
    );
    physicsRecordingFrames.current = repairedRecording;
    setFrames((currentFrames) => removeCollectedShots(
      repairFramesAfterIntakeCollection(currentFrames, frameIndex, newArtifactIds.length),
      frameIndex,
      collectedShotIds,
    ));
  };

  const recordPhysicsShots = (frameIndex: number, shots: ShotPhysicsState[]) => {
    if (!physicsRecordingFrames.current) return;
    const collectedShotIds = new Set(
      Array.from(physicsCollectedArtifacts.current)
        .map((id) => id.match(/^shot-(\d+)$/)?.[1])
        .filter((id): id is string => Boolean(id))
        .map((id) => Number(id)),
    );
    const nextShots = shots
      .filter((shot) => !collectedShotIds.has(shot.id))
      .map((shot) => ({ ...shot }));
    physicsRecordingShots.current.set(frameIndex, nextShots);

    physicsRecordingFrames.current[frameIndex] = {
      ...physicsRecordingFrames.current[frameIndex],
      shots: nextShots,
    };
    const liveScoredFrames = applyScoringToFrames(physicsRecordingFrames.current.slice(0, frameIndex + 1), allianceColor);
    const liveScoredFrame = liveScoredFrames[liveScoredFrames.length - 1];
    if (!liveScoredFrame?.score) return;
    liveScoreRef.current = cloneScore(liveScoredFrame.score);
    setLiveScore(cloneScore(liveScoredFrame.score));
    physicsRecordingFrames.current = physicsRecordingFrames.current.map((item, index) => (
      index <= frameIndex && liveScoredFrames[index]
        ? {
          ...item,
          score: liveScoredFrames[index].score,
          scoreEvent: liveScoredFrames[index].scoreEvent,
          event: liveScoredFrames[index].event,
          warning: liveScoredFrames[index].warning,
        }
        : item
    ));

    setFrames((currentFrames) => currentFrames.map((item, index) => (
      index <= frameIndex && liveScoredFrames[index]
        ? {
          ...item,
          shots: index === frameIndex ? nextShots : item.shots,
          score: liveScoredFrames[index].score,
          scoreEvent: liveScoredFrames[index].scoreEvent,
          event: liveScoredFrames[index].event,
          warning: liveScoredFrames[index].warning,
        }
        : index > frameIndex
          ? {
            ...item,
            score: liveScoredFrame.score,
          }
          : item
    )));
  };

  const updateControlMode = (value: ControlMode) => {
    if (value === controlMode) return;
    stopPlayback();
    setPlaybackId((id) => id + 1);
    setControlModeState(value);
    setFrames([createSetupFrame({ x: startX, y: startY, heading: startHeading }, preloadCount, selectedArtifactRows)]);
    setIndex(0);
    setHasRun(false);
    setAnalysis(null);
    setChatMessages([]);
    setSetupWarning("");
    resetLiveScore();
  };

  const teleopFrame = (
    runtime: TeleopRuntime,
    pose: StartPose,
    overrides: Partial<TelemetryFrame> = {},
  ): TelemetryFrame => ({
    ...baseFrame,
    ...pose,
    time: runtime.time,
    leftEncoder: runtime.leftEncoder,
    rightEncoder: runtime.rightEncoder,
    shooterTarget: TELEOP_SHOT_RPM,
    shooterRpm: TELEOP_SHOT_RPM,
    artifactCount: runtime.artifactCount,
    artifacts: cloneArtifactFrameState(runtime.artifacts),
    ...overrides,
  });

  const advanceTeleop = () => {
    const runtime = teleopRuntime.current;
    if (!runtime) return;

    const keys = teleopKeys.current;
    const previousPose = { ...runtime.pose };
    const turnDirection = (keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0);
    const nextHeading = normalizeHeading(runtime.pose.heading + turnDirection * TELEOP_TURN_DEGREES_PER_SECOND * SIMULATION_FRAME_SECONDS);
    const forwardAxis = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
    const strafeAxis = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    const intakeMode: TelemetryFrame["intake"] = keys.has("z") ? "in" : "off";
    const isDriving = forwardAxis !== 0 || strafeAxis !== 0;
    const driveHeading = isDriving && turnDirection !== 0
      ? lerpHeading(runtime.pose.heading, nextHeading, 0.5)
      : nextHeading;
    const headingRadians = driveHeading * THREE_DEGREES_TO_RADIANS;
    const forward = { x: Math.cos(headingRadians), y: -Math.sin(headingRadians) };
    const right = { x: Math.sin(headingRadians), y: Math.cos(headingRadians) };
    const axisMagnitude = Math.hypot(forwardAxis, strafeAxis) || 1;
    const driveStep = TELEOP_DRIVE_SPEED_INCHES_PER_SECOND * SIMULATION_FRAME_SECONDS / axisMagnitude;
    const nextPose = constrainRobotPose(
      {
        x: runtime.pose.x + (forward.x * forwardAxis + right.x * strafeAxis) * driveStep,
        y: runtime.pose.y + (forward.y * forwardAxis + right.y * strafeAxis) * driveStep,
        heading: nextHeading,
      },
      robotWidth,
      robotLength,
    );
    const movedDistance = Math.hypot(nextPose.x - previousPose.x, nextPose.y - previousPose.y);
    runtime.leftEncoder += movedDistance - turnDirection * 0.18;
    runtime.rightEncoder += movedDistance + turnDirection * 0.18;
    runtime.pose = nextPose;
    runtime.time += SIMULATION_FRAME_SECONDS;
    stepArtifactPhysics(runtime.artifacts, nextPose, previousPose, robotWidth, robotLength, SIMULATION_FRAME_SECONDS);

    appendTeleopFrame(teleopFrame(runtime, nextPose, {
      leftPower: clamp(forwardAxis - strafeAxis - turnDirection * 0.45, -1, 1),
      rightPower: clamp(forwardAxis + strafeAxis + turnDirection * 0.45, -1, 1),
      intake: intakeMode,
      event: runtime.time <= SIMULATION_FRAME_SECONDS ? "TeleOp started" : "",
    }));
  };

  const fireTeleopShot = () => {
    const runtime = teleopRuntime.current;
    if (!runtime) return;

    if (runtime.artifactCount <= 0) {
      appendTeleopFrame(teleopFrame(runtime, runtime.pose, {
        warning: "No artifact loaded to shoot",
        event: "TeleOp shot blocked",
      }));
      return;
    }

    runtime.artifactCount -= 1;
    runtime.shotId += 1;
    appendTeleopFrame(teleopFrame(runtime, runtime.pose, {
      feeder: true,
      event: `TeleOp shoot ${TELEOP_SHOT_ANGLE} deg`,
      shot: {
        id: runtime.shotId,
        speed: Math.max(0.5, TELEOP_SHOT_RPM / 3600 * 8),
        angle: TELEOP_SHOT_ANGLE,
      },
    }));
  };

  const startTeleop = (startPose: StartPose) => {
    const artifacts = createArtifacts(selectedArtifactRows);
    const safePreloadCount = Math.round(clamp(preloadCount, 0, 3));
    const initialFrame: TelemetryFrame = {
      ...baseFrame,
      ...startPose,
      artifactCount: safePreloadCount,
      shooterTarget: TELEOP_SHOT_RPM,
      shooterRpm: TELEOP_SHOT_RPM,
      artifacts: cloneArtifactFrameState(artifacts),
      event: "TeleOp ready",
    };

    if (timer.current) clearInterval(timer.current);
    teleopKeys.current.clear();
    teleopRuntime.current = {
      pose: { ...startPose },
      time: 0,
      leftEncoder: 0,
      rightEncoder: 0,
      artifactCount: safePreloadCount,
      shotId: 0,
      artifacts,
    };
    physicsRecordingFrames.current = [cloneFrameForRecording(initialFrame)];
    physicsRecordingArtifacts.current = new Map();
    physicsCollectedArtifacts.current = new Set();
    physicsRecordingShots.current = new Map();
    setPlaybackId((id) => id + 1);
    setFrames([initialFrame]);
    setIndex(0);
    setRunning(true);
    timer.current = setInterval(advanceTeleop, PLAYBACK_INTERVAL_MS);
  };

  const run = () => {
    const startPose = { x: startX, y: startY, heading: startHeading };
    if (!isRobotPoseInsideField(startPose, robotWidth, robotLength)) {
      stopPlayback();
      setPlaybackId((id) => id + 1);
      setFrames([createSetupFrame(
        startPose,
        preloadCount,
        selectedArtifactRows,
        { warning: "Invalid start position" },
        [{ code: "ROBOT_BOUNDS", severity: "major", message: "Starting robot footprint is outside the DECODE field boundary.", time: 0 }],
      )]);
      setIndex(0);
      setHasRun(false);
      setAnalysis(null);
      setChatMessages([]);
      setSetupWarning("Invalid start position");
      return;
    }

    setRunId((id) => id + 1);
    setAnalysis(null);
    setChatMessages([]);
    setAnalysisError("");
    setSetupWarning("");
    setHasRun(false);
    resetLiveScore();
    if (controlMode === "teleop") {
      startTeleop(startPose);
      return;
    }
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

  const requestAnalysis = useCallback(async (question?: string) => {
    const userMessage: AIChatMessage | null = question
      ? { id: `user-${Date.now()}`, role: "user", content: question, createdAt: Date.now() }
      : null;
    const nextMessages = userMessage ? [...chatMessages, userMessage] : chatMessages;
    const requestMessages = nextMessages.slice(-8);
    if (userMessage) setChatMessages(nextMessages);

    setAnalysisPending(true);
    setAnalysisError("");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          code,
          robotSetup: {
            robotId,
            robotName: robotPresets.find((robot) => robot.id === robotId)?.name || robotId,
            width: robotWidth,
            length: robotLength,
            allianceColor,
            coordinateSystem,
            controlMode,
            startPose: {
              x: displayStartPosition.x,
              y: displayStartPosition.y,
              heading: startHeading,
            },
            preloadCount,
            selectedArtifactRows,
          },
          frames: selectAnalysisFrames(frames),
          messages: requestMessages,
          question,
        }),
      });
      if (!response.ok) throw new Error(`Analyze failed with ${response.status}`);
      const result = await response.json() as AnalyzeResponse;
      if (!question) setAnalysis(result.feedback);
      if (question) setChatMessages((current) => [...current, result.assistantMessage]);
      setTimeout(() => document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (error) {
      if (!question) setAnalysis(analysisUnavailableFeedback);
      setAnalysisError(error instanceof Error ? error.message : "Analyze request failed");
    } finally {
      setAnalysisPending(false);
    }
  }, [allianceColor, chatMessages, code, controlMode, coordinateSystem, displayStartPosition.x, displayStartPosition.y, frames, goal, preloadCount, robotId, robotLength, robotWidth, selectedArtifactRows, startHeading]);

  useEffect(() => {
    if (controlMode !== "autonomous" || !hasRun || running || frames.length <= 1 || lastAutoAnalysisRun.current === runId) return;
    lastAutoAnalysisRun.current = runId;
    void requestAnalysis();
  }, [controlMode, frames.length, hasRun, requestAnalysis, runId, running]);

  useEffect(() => {
    if (controlMode !== "teleop") {
      teleopKeys.current.clear();
      return;
    }

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
    };
    const pressedKeys = teleopKeys.current;
    const controlKeys = new Set(["w", "a", "s", "d", "z", "arrowleft", "arrowright", " "]);
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.code === "Space" ? " " : event.key.toLowerCase();
      if (!running || !controlKeys.has(key) || isEditableTarget(event.target)) return;
      event.preventDefault();
      if (key === " " && !event.repeat) {
        fireTeleopShot();
        return;
      }
      if (key !== " ") pressedKeys.add(key);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.code === "Space" ? " " : event.key.toLowerCase();
      if (!controlKeys.has(key)) return;
      pressedKeys.delete(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      pressedKeys.clear();
    };
    // TeleOp actions read mutable refs so this should only rebind on mode/run state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlMode, running]);

  const fieldTrail = useMemo(() => {
    if (controlMode === "teleop") {
      const shotFrames: TelemetryFrame[] = [];
      for (let frameIndex = 0; frameIndex <= index; frameIndex++) {
        const recordedFrame = frames[frameIndex];
        if (recordedFrame?.shot) shotFrames.push(recordedFrame);
      }
      return shotFrames;
    }

    return frames.slice(0, index + 1);
  }, [controlMode, frames, index]);

  const shootSignal = frame.shot ? (runId + 1) * 1000000 + playbackId * 10000 + frame.shot.id : -1;

  return (
    <main className="sim-shell">
      <header className="sim-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="sim-title"><span>SIMULATION</span><i />{robotPresets.find((robot) => robot.id === robotId)?.name}</div>
        <div className="sim-nav-right"><span><i className="live-dot" />SIMULATION READY</span><Link href="/">Exit lab x</Link></div>
      </header>
      <div className="sim-layout">
        <InputPanel
          {...{
            controlMode,
            setControlMode: updateControlMode,
            goal,
            setGoal,
            code,
            setCode,
            running,
            robotId,
            allianceColor,
            setAllianceColor: updateAllianceColor,
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
          onAnalyze={() => void requestAnalysis()}
          canAnalyze={hasRun}
        />
        <div className="workspace">
          <div className="field-row">
            <FieldSimulator
              frame={frame}
              trail={fieldTrail}
              showRobotTrail={controlMode !== "teleop"}
              running={running}
              robotId={robotId}
              allianceColor={allianceColor}
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
              onPhysicsArtifactCollected={recordPhysicsArtifactCollected}
              onPhysicsShots={recordPhysicsShots}
              onSeek={seek}
              onTogglePlayback={togglePlayback}
            />
            <div className="right-rail">
              <ScorePanel frame={displayFrame} />
              <TelemetryPanel frame={frame} events={events} progress={(index / Math.max(1, frames.length - 1)) * 100} coordinateSystem={coordinateSystem} />
            </div>
          </div>
          {(hasRun || analysis) && (
            <div id="analysis">
              <AIFeedbackPanel
                data={analysis}
                goal={goal}
                messages={chatMessages}
                pending={analysisPending}
                error={analysisError}
                onSend={(question) => void requestAnalysis(question)}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
