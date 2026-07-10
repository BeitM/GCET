"use client";

import { Line, OrbitControls, Text, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BallCollider, CuboidCollider, Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { Suspense, type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AllianceColor, ArtifactPhysicsState, ArtifactRowId, CoordinateSystem, ShotPhysicsState, TelemetryFrame } from "@/lib/types";
import { ShooterRobotModel } from "@/components/ShooterRobotModel";
import { RobotPresetId } from "@/lib/robots";

const INCHES_TO_METERS = 0.0254;
const FIELD_INCHES = 144;
const FIELD_METERS = FIELD_INCHES * INCHES_TO_METERS;
const ARTIFACT_RADIUS = 2.5 * INCHES_TO_METERS;
const ARTIFACT_CENTER_Y = 0.034 + ARTIFACT_RADIUS;
const SHOT_RETURN_Y = -24 * INCHES_TO_METERS;
const ARTIFACT_WALL_CLEARANCE_INCHES = 3.25;
const MAX_FREE_ARTIFACT_SPEED = 3.2;
const ARTIFACT_WAKE_DISTANCE = 36 * INCHES_TO_METERS;
const ARTIFACT_SLEEP_SPEED = 0.16;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type FieldScene3DProps = {
  frame: TelemetryFrame;
  trail: TelemetryFrame[];
  showRobotTrail: boolean;
  robotWidth: number;
  robotLength: number;
  robotId: RobotPresetId;
  allianceColor: AllianceColor;
  coordinateSystem: CoordinateSystem;
  selectedArtifactRows: ArtifactRowId[];
  running: boolean;
  recordingPhysics: boolean;
  shootSignal?: number;
  ballResetSignal: number;
  frameIndex: number;
  onPhysicsArtifacts: (frameIndex: number, artifacts: ArtifactPhysicsState[]) => void;
  onPhysicsArtifactCollected: (frameIndex: number, artifactIds: string[]) => void;
  onPhysicsShots: (frameIndex: number, shots: ShotPhysicsState[]) => void;
};

type FieldMouseCoordinates = { x: number; y: number } | null;
type ReferenceTextProps = ComponentProps<typeof Text>;
type ArtifactSpec = { id: string; row: ArtifactRowId; x: number; y: number; color: "green" | "purple" };
type ArtifactSeed = ArtifactSpec | ArtifactPhysicsState;

function clampBodyVelocity(body: RapierRigidBody, maxSpeed = MAX_FREE_ARTIFACT_SPEED) {
  const velocity = body.linvel();
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
  if (speed <= maxSpeed || speed === 0) return;
  const scale = maxSpeed / speed;
  body.setLinvel({ x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale }, true);
}

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

function fieldPosition(x: number, y: number): [number, number, number] {
  return [(x - 72) * INCHES_TO_METERS, 0, (y - 72) * INCHES_TO_METERS];
}

function displayCoordinatesFromWorld(point: THREE.Vector3, coordinateSystem: CoordinateSystem): FieldMouseCoordinates {
  const half = FIELD_METERS / 2;
  if (point.x < -half || point.x > half || point.z < -half || point.z > half) return null;

  const fieldX = Math.min(FIELD_INCHES, Math.max(0, point.x / INCHES_TO_METERS + FIELD_INCHES / 2));
  const fieldY = Math.min(FIELD_INCHES, Math.max(0, point.z / INCHES_TO_METERS + FIELD_INCHES / 2));

  if (coordinateSystem === "center") return { x: fieldX - FIELD_INCHES / 2, y: FIELD_INCHES / 2 - fieldY };
  return { x: fieldX, y: FIELD_INCHES - fieldY };
}

function fieldPercent(x: number, z: number): [number, number, number] {
  return [
    (x / 100 - 0.5) * FIELD_METERS,
    0,
    (z / 100 - 0.5) * FIELD_METERS,
  ];
}

function FlatTape({
  from,
  to,
  color,
  width = 0.018,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  width?: number;
}) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);

  return (
    <mesh
      position={[(from[0] + to[0]) / 2, 0, (from[2] + to[2]) / 2]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
      receiveShadow
    >
      <boxGeometry args={[length, 0.0015, width]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function DecodeFieldModel() {
  const { scene } = useGLTF("/models/fields/decode-field.glb");
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [model]);

  return (
    <RigidBody type="fixed" colliders="trimesh" position={[0, 0.031, 0]} rotation={[0, Math.PI, 0]}>
      <primitive object={model} />
    </RigidBody>
  );
}

function FieldMarkings() {
  const gridLines = [-2, -1, 0, 1, 2].map((tile) => tile * (FIELD_METERS / 6));
  const parkZone = (x1: number, z1: number, x2: number, z2: number) => [
    fieldPercent(x1, z1),
    fieldPercent(x2, z1),
    fieldPercent(x2, z2),
    fieldPercent(x1, z2),
    fieldPercent(x1, z1),
  ];

  return (
    <group position={[0, 0.034, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {gridLines.map((position) => (
        <group key={position}>
          <mesh position={[position, -0.0025, 0]} receiveShadow>
            <boxGeometry args={[0.008, 0.001, FIELD_METERS]} />
            <meshStandardMaterial color="#111315" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.0025, position]} receiveShadow>
            <boxGeometry args={[FIELD_METERS, 0.001, 0.008]} />
            <meshStandardMaterial color="#111315" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <Line points={[fieldPercent(0, 17), fieldPercent(17, 4)]} color="#f4f5f2" lineWidth={3} />
      <Line points={[fieldPercent(10, 10), fieldPercent(50, 50)]} color="#f4f5f2" lineWidth={3} />
      <Line points={[fieldPercent(100, 33), fieldPercent(84, 50), fieldPercent(100, 67)]} color="#f4f5f2" lineWidth={3} />
      <Line points={[fieldPercent(50, 50), fieldPercent(10, 90)]} color="#f4f5f2" lineWidth={3} />
      <Line points={[fieldPercent(0, 83), fieldPercent(17, 96)]} color="#f4f5f2" lineWidth={3} />

      <FlatTape from={fieldPercent(45.083, 5.436)} to={fieldPercent(83, 5.436)} color="#3437a5" />
      <FlatTape from={fieldPercent(48.6, 84)} to={fieldPercent(48.6, 91)} color="#3437a5" />
      <FlatTape from={fieldPercent(50.4, 84)} to={fieldPercent(50.4, 91)} color="#3437a5" />
      <FlatTape from={fieldPercent(45.083, 94.564)} to={fieldPercent(83, 94.564)} color="#ed2532" />
      <FlatTape from={fieldPercent(48.6, 9)} to={fieldPercent(48.6, 16)} color="#ed2532" />
      <FlatTape from={fieldPercent(50.4, 9)} to={fieldPercent(50.4, 16)} color="#ed2532" />

      <Line points={parkZone(84, 0.8, 99.2, 16)} color="#f4f5f2" lineWidth={3} />
      <Line points={parkZone(84, 84, 99.2, 99.2)} color="#f4f5f2" lineWidth={3} />

      <Line points={parkZone(70.5, 20.5, 83.5, 33.5)} color="#3036a7" lineWidth={4} />
      <Line points={parkZone(70.5, 66.5, 83.5, 79.5)} color="#f02431" lineWidth={4} />
    </group>
  );
}

function FieldBounds() {
  const half = FIELD_METERS / 2;
  const walls = [
    { position: [0, 0.14, -half] as [number, number, number], size: [FIELD_METERS, 0.28, 0.055] as [number, number, number] },
    { position: [0, 0.14, half] as [number, number, number], size: [FIELD_METERS, 0.28, 0.055] as [number, number, number] },
    { position: [-half, 0.14, 0] as [number, number, number], size: [0.055, 0.28, FIELD_METERS] as [number, number, number] },
    { position: [half, 0.14, 0] as [number, number, number], size: [0.055, 0.28, FIELD_METERS] as [number, number, number] },
  ];

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow>
          <boxGeometry args={[FIELD_METERS, 0.06, FIELD_METERS]} />
          <meshStandardMaterial color="#292b2e" roughness={0.95} />
        </mesh>
        <CuboidCollider args={[half, 0.03, half]} friction={1.1} />
      </RigidBody>
      {walls.map(({ position, size }, index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid" position={position}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#aeb5b8" metalness={0.65} roughness={0.32} />
          </mesh>
        </RigidBody>
      ))}
      <FieldMarkings />
    </group>
  );
}

function Robot({ frame, width, length, running, allianceColor }: { frame: TelemetryFrame; width: number; length: number; running: boolean; allianceColor: AllianceColor }) {
  const body = useRef<RapierRigidBody>(null);
  const widthMeters = width * INCHES_TO_METERS;
  const lengthMeters = length * INCHES_TO_METERS;
  const position = fieldPosition(frame.x, frame.y);
  const chassisRotation = THREE.MathUtils.degToRad(frame.heading - 90);
  const visualPosition = useRef(new THREE.Vector3(position[0], 0.12, position[2]));
  const visualRotation = useRef(chassisRotation);

  useEffect(() => {
    if (frame.time !== 0) return;
    visualPosition.current.set(position[0], 0.12, position[2]);
    visualRotation.current = chassisRotation;
  }, [chassisRotation, frame.time, position]);

  useFrame((_, delta) => {
    const targetPosition = new THREE.Vector3(position[0], 0.12, position[2]);
    const stepDelta = Math.min(delta, 1 / 30);

    if (running) {
      const toTarget = targetPosition.clone().sub(visualPosition.current);
      const distance = toTarget.length();
      const rotationDelta = Math.atan2(Math.sin(chassisRotation - visualRotation.current), Math.cos(chassisRotation - visualRotation.current));
      const combinedMoveAndTurn = distance > 0.002 && Math.abs(rotationDelta) > THREE.MathUtils.degToRad(0.35);
      const maxLinearStep = (combinedMoveAndTurn ? 3.25 : 2.1) * stepDelta;
      if (distance <= maxLinearStep || distance === 0) visualPosition.current.copy(targetPosition);
      else visualPosition.current.add(toTarget.multiplyScalar(maxLinearStep / distance));

      const maxRotationStep = THREE.MathUtils.degToRad(combinedMoveAndTurn ? 900 : 420) * stepDelta;
      visualRotation.current += clamp(rotationDelta, -maxRotationStep, maxRotationStep);
    } else {
      visualPosition.current.copy(targetPosition);
      visualRotation.current = chassisRotation;
    }

    body.current?.setNextKinematicTranslation({ x: visualPosition.current.x, y: visualPosition.current.y, z: visualPosition.current.z });
    body.current?.setNextKinematicRotation(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, visualRotation.current, 0)),
    );
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[position[0], 0.12, position[2]]} canSleep={false}>
      <CuboidCollider args={[widthMeters / 2, 0.2, lengthMeters / 2]} position={[0, 0.08, 0]} friction={1.2} />
      <ShooterRobotModel frame={frame} width={widthMeters} length={lengthMeters} running={running} allianceColor={allianceColor} />
    </RigidBody>
  );
}

function RobotTrail({ trail }: { trail: TelemetryFrame[] }) {
  const points = useMemo(() => trail.map(({ x, y }) => {
    const [worldX, , worldZ] = fieldPosition(x, y);
    return [worldX, 0.055, worldZ] as [number, number, number];
  }), [trail]);
  return points.length > 1 ? <Line points={points} color="#25e0da" lineWidth={2} transparent opacity={0.75} /> : null;
}

function artifactWorldPosition(artifact: Pick<ArtifactSpec, "x" | "y">, y = 0): [number, number, number] {
  const [x, , z] = fieldPosition(artifact.x, artifact.y);
  return [-z, y, x];
}

function fieldCoordinatesFromWorld(translation: { x: number; z: number }) {
  return {
    x: translation.z / INCHES_TO_METERS + FIELD_INCHES / 2,
    y: FIELD_INCHES / 2 - translation.x / INCHES_TO_METERS,
  };
}

function retireBody(body: RapierRigidBody) {
  body.setTranslation({ x: 99, y: -99, z: 99 }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  body.sleep();
}

function ArtifactMarker({ artifact }: { artifact: ArtifactSpec }) {
  const [x, y, z] = artifactWorldPosition(artifact, 0.067);
  const color = artifact.color === "green" ? "#4bed4b" : "#ad36d2";

  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={20}>
      <circleGeometry args={[0.035, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

function ArtifactSetupMarkers({ selectedRows }: { selectedRows: ArtifactRowId[] }) {
  const selected = useMemo(() => new Set(selectedRows), [selectedRows]);
  return (
    <group>
      {artifactSpecs.filter((artifact) => selected.has(artifact.row)).map((artifact) => (
        <ArtifactMarker key={artifact.id} artifact={artifact} />
      ))}
    </group>
  );
}

function ArtifactBallMesh({ color, roll = 0 }: { color: ArtifactSpec["color"]; roll?: number }) {
  const materialColor = color === "green" ? "#4bed4b" : "#ad36d2";
  const emissive = color === "green" ? "#1d7b24" : "#5e1b76";

  return (
    <group rotation={[roll, 0, 0]}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[ARTIFACT_RADIUS, 24, 16]} />
        <meshStandardMaterial color={materialColor} emissive={emissive} emissiveIntensity={0.16} roughness={0.62} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARTIFACT_RADIUS * 0.7, ARTIFACT_RADIUS * 0.12, 8, 24]} />
        <meshStandardMaterial color="#111318" roughness={0.55} />
      </mesh>
    </group>
  );
}

function FieldArtifact({ artifact }: { artifact: ArtifactPhysicsState }) {
  const [x, y, z] = artifactWorldPosition(artifact, ARTIFACT_CENTER_Y);

  return (
    <group position={[x, y, z]}>
      <ArtifactBallMesh color={artifact.color} roll={artifact.roll} />
    </group>
  );
}

function FieldArtifacts({
  frame,
  selectedRows,
}: {
  frame: TelemetryFrame;
  selectedRows: ArtifactRowId[];
}) {
  const selected = useMemo(() => new Set(selectedRows), [selectedRows]);
  const artifacts = frame.artifacts ?? artifactSpecs
    .filter((artifact) => selected.has(artifact.row))
    .map((artifact) => ({ ...artifact, roll: 0 }));

  return (
    <group>
      {artifacts.map((artifact) => (
        <FieldArtifact key={artifact.id} artifact={artifact} />
      ))}
    </group>
  );
}

function DynamicArtifactBody({
  artifact,
  bodyRef,
}: {
  artifact: ArtifactSeed;
  bodyRef: (body: RapierRigidBody | null) => void;
}) {
  const safeArtifact = {
    ...artifact,
    x: clamp(artifact.x, ARTIFACT_WALL_CLEARANCE_INCHES, FIELD_INCHES - ARTIFACT_WALL_CLEARANCE_INCHES),
    y: clamp(artifact.y, ARTIFACT_WALL_CLEARANCE_INCHES, FIELD_INCHES - ARTIFACT_WALL_CLEARANCE_INCHES),
  };
  const [x, y, z] = artifactWorldPosition(safeArtifact, ARTIFACT_CENTER_Y);

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      position={[x, y, z]}
      mass={0.08}
      friction={1.1}
      restitution={0.12}
      linearDamping={2.2}
      angularDamping={1.2}
      canSleep
      ccd
    >
      <BallCollider args={[ARTIFACT_RADIUS]} />
      <ArtifactBallMesh color={artifact.color} />
    </RigidBody>
  );
}

function DynamicArtifactsRecorder({
  frame,
  selectedRows,
  initialArtifacts,
  robotWidth,
  robotLength,
  frameIndex,
  resetSignal,
  onRecord,
  onCollect,
}: {
  frame: TelemetryFrame;
  selectedRows: ArtifactRowId[];
  initialArtifacts?: ArtifactPhysicsState[];
  robotWidth: number;
  robotLength: number;
  frameIndex: number;
  resetSignal: number;
  onRecord: (frameIndex: number, artifacts: ArtifactPhysicsState[]) => void;
  onCollect: (frameIndex: number, artifactIds: string[]) => void;
}) {
  const selected = useMemo(() => new Set(selectedRows), [selectedRows]);
  const artifacts = useMemo<ArtifactSeed[]>(
    () => initialArtifacts ?? artifactSpecs.filter((artifact) => selected.has(artifact.row)),
    [initialArtifacts, selected],
  );
  const bodies = useRef<Record<string, RapierRigidBody | null>>({});
  const returnedArtifacts = useRef<Set<string>>(new Set());
  const [retiredArtifactIds, setRetiredArtifactIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    returnedArtifacts.current = new Set();
    setRetiredArtifactIds(new Set());
  }, [resetSignal]);

  const retireArtifact = (artifactId: string, body: RapierRigidBody) => {
    returnedArtifacts.current.add(artifactId);
    retireBody(body);
    setRetiredArtifactIds((current) => {
      if (current.has(artifactId)) return current;
      const next = new Set(current);
      next.add(artifactId);
      return next;
    });
  };

  useFrame(() => {
    const [robotX, , robotZ] = fieldPosition(frame.x, frame.y);
    const headingRadians = THREE.MathUtils.degToRad(frame.heading);
    const intakeForward = { x: Math.cos(headingRadians), z: -Math.sin(headingRadians) };
    const intakeRight = { x: Math.sin(headingRadians), z: Math.cos(headingRadians) };
    const frontMin = robotLength * INCHES_TO_METERS / 2 - ARTIFACT_RADIUS * 1.35;
    const frontMax = robotLength * INCHES_TO_METERS / 2 + ARTIFACT_RADIUS * 2.75;
    const sideLimit = robotWidth * INCHES_TO_METERS / 2 + ARTIFACT_RADIUS * 1.25;
    const canCollect = frame.intake === "in" && (frame.artifactCount < 3 || frame.event?.includes("collected artifact"));
    const recorded = artifacts.flatMap((artifact) => {
      if (returnedArtifacts.current.has(artifact.id)) return [];
      const body = bodies.current[artifact.id];
      if (!body) return [];
      clampBodyVelocity(body);
      const translation = body.translation();
      const rotation = body.rotation();

      const dx = translation.x - robotX;
      const dz = translation.z - robotZ;
      const distanceToRobot = Math.hypot(dx, dz);
      const velocity = body.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      if (distanceToRobot > ARTIFACT_WAKE_DISTANCE && speed < ARTIFACT_SLEEP_SPEED) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.sleep();
      } else if (distanceToRobot <= ARTIFACT_WAKE_DISTANCE) {
        body.wakeUp();
      }

      const localForward = dx * intakeForward.x + dz * intakeForward.z;
      const localRight = dx * intakeRight.x + dz * intakeRight.z;
      const insideIntake = localForward >= frontMin && localForward <= frontMax && Math.abs(localRight) <= sideLimit;

      const collectedByIntake = canCollect && insideIntake;
      if (translation.y <= SHOT_RETURN_Y || collectedByIntake) {
        retireArtifact(artifact.id, body);
        if (collectedByIntake) onCollect(frameIndex, [artifact.id]);
        return [];
      }

      const field = fieldCoordinatesFromWorld(translation);
      const rollEuler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
      return [{
        id: artifact.id,
        row: artifact.row,
        color: artifact.color,
        x: field.x,
        y: field.y,
        roll: rollEuler.x,
      }];
    });
    onRecord(frameIndex, recorded);
  });

  return (
    <group key={resetSignal}>
      {artifacts.filter((artifact) => !retiredArtifactIds.has(artifact.id)).map((artifact) => (
        <DynamicArtifactBody
          key={artifact.id}
          artifact={artifact}
          bodyRef={(body) => {
            bodies.current[artifact.id] = body;
          }}
        />
      ))}
    </group>
  );
}

function shotLaunchState(shotFrame: TelemetryFrame, robotLength: number) {
  const shot = shotFrame.shot!;
  const [robotX, , robotZ] = fieldPosition(shotFrame.x, shotFrame.y);
  const headingRadians = THREE.MathUtils.degToRad(shotFrame.heading);
  const forward = new THREE.Vector3(Math.cos(headingRadians), 0, -Math.sin(headingRadians));
  const muzzleOffset = robotLength * INCHES_TO_METERS / 2 + 0.12;
  const angleRadians = THREE.MathUtils.degToRad(shot.angle);
  const horizontalSpeed = shot.speed * Math.cos(angleRadians);
  const verticalSpeed = shot.speed * Math.sin(angleRadians);

  return {
    position: new THREE.Vector3(
      robotX + forward.x * muzzleOffset,
      0.34,
      robotZ + forward.z * muzzleOffset,
    ),
    velocity: new THREE.Vector3(
      forward.x * horizontalSpeed,
      verticalSpeed,
      forward.z * horizontalSpeed,
    ),
  };
}

function DynamicShotBody({
  shotFrame,
  robotLength,
  bodyRef,
}: {
  shotFrame: TelemetryFrame;
  robotLength: number;
  bodyRef: (body: RapierRigidBody | null) => void;
}) {
  const body = useRef<RapierRigidBody>(null);
  const launch = useMemo(() => shotLaunchState(shotFrame, robotLength), [robotLength, shotFrame]);
  const initialized = useRef(false);

  useFrame(() => {
    if (initialized.current) return;
    if (!body.current) return;

    body.current.wakeUp();
    body.current.setLinvel({ x: launch.velocity.x, y: launch.velocity.y, z: launch.velocity.z }, true);
    body.current.setAngvel({ x: launch.velocity.z / ARTIFACT_RADIUS, y: 0, z: -launch.velocity.x / ARTIFACT_RADIUS }, true);
    bodyRef(body.current);
    initialized.current = true;
  });

  return (
    <RigidBody
      ref={body}
      type="dynamic"
      colliders={false}
      position={[launch.position.x, launch.position.y, launch.position.z]}
      mass={0.08}
      friction={0.95}
      restitution={0.12}
      linearDamping={0.25}
      angularDamping={0.15}
      canSleep
      ccd
    >
      <BallCollider args={[ARTIFACT_RADIUS]} />
      <ArtifactBallMesh color="purple" />
    </RigidBody>
  );
}

function DynamicShotsRecorder({
  frame,
  trail,
  robotWidth,
  robotLength,
  frameIndex,
  resetSignal,
  onRecord,
  onCollect,
}: {
  trail: TelemetryFrame[];
  robotLength: number;
  robotWidth: number;
  frame: TelemetryFrame;
  frameIndex: number;
  resetSignal: number;
  onRecord: (frameIndex: number, shots: ShotPhysicsState[]) => void;
  onCollect: (frameIndex: number, artifactIds: string[]) => void;
}) {
  const shotFrames = useMemo(() => {
    const byId = new Map<number, TelemetryFrame>();
    trail.forEach((frame) => {
      if (frame.shot && !byId.has(frame.shot.id)) byId.set(frame.shot.id, frame);
    });
    return Array.from(byId.values());
  }, [trail]);
  const bodies = useRef<Record<number, RapierRigidBody | null>>({});
  const returnedShots = useRef<Set<number>>(new Set());
  const [retiredShotIds, setRetiredShotIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    returnedShots.current = new Set();
    setRetiredShotIds(new Set());
  }, [resetSignal]);

  const retireShot = (shotId: number, body: RapierRigidBody) => {
    returnedShots.current.add(shotId);
    retireBody(body);
    setRetiredShotIds((current) => {
      if (current.has(shotId)) return current;
      const next = new Set(current);
      next.add(shotId);
      return next;
    });
  };

  useFrame(() => {
    const [robotX, , robotZ] = fieldPosition(frame.x, frame.y);
    const headingRadians = THREE.MathUtils.degToRad(frame.heading);
    const intakeForward = { x: Math.cos(headingRadians), z: -Math.sin(headingRadians) };
    const intakeRight = { x: Math.sin(headingRadians), z: Math.cos(headingRadians) };
    const frontMin = robotLength * INCHES_TO_METERS / 2 - ARTIFACT_RADIUS * 1.35;
    const frontMax = robotLength * INCHES_TO_METERS / 2 + ARTIFACT_RADIUS * 2.75;
    const sideLimit = robotWidth * INCHES_TO_METERS / 2 + ARTIFACT_RADIUS * 1.25;
    const canCollect = frame.intake === "in" && frame.artifactCount < 3;

    const recorded = shotFrames.flatMap((shotFrame) => {
      const shot = shotFrame.shot;
      if (!shot) return [];
      if (returnedShots.current.has(shot.id)) return [];

      const body = bodies.current[shot.id];
      if (!body) return [];
      clampBodyVelocity(body, Math.max(MAX_FREE_ARTIFACT_SPEED, shot.speed * 1.1));
      const translation = body.translation();
      const rotation = body.rotation();
      const rollEuler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
      const dx = translation.x - robotX;
      const dz = translation.z - robotZ;
      const distanceToRobot = Math.hypot(dx, dz);
      const velocity = body.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      if (distanceToRobot <= ARTIFACT_WAKE_DISTANCE) {
        body.wakeUp();
      } else if (speed < ARTIFACT_SLEEP_SPEED && translation.y <= ARTIFACT_CENTER_Y + 0.04) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.sleep();
      }

      const localForward = dx * intakeForward.x + dz * intakeForward.z;
      const localRight = dx * intakeRight.x + dz * intakeRight.z;
      const settledAtIntakeHeight = translation.y <= ARTIFACT_CENTER_Y + 0.055 && speed <= 1.8;
      const insideIntake = localForward >= frontMin && localForward <= frontMax && Math.abs(localRight) <= sideLimit && settledAtIntakeHeight;

      if (canCollect && insideIntake) {
        retireShot(shot.id, body);
        onCollect(frameIndex, [`shot-${shot.id}`]);
        return [];
      }

      if (translation.y <= SHOT_RETURN_Y) {
        retireShot(shot.id, body);
        return [];
      }

      return [{
        id: shot.id,
        x: translation.x,
        y: translation.y,
        z: translation.z,
        roll: rollEuler.x,
      }];
    });
    onRecord(frameIndex, recorded);
  });

  return (
    <group key={resetSignal}>
      {shotFrames.filter((shotFrame) => !retiredShotIds.has(shotFrame.shot!.id)).map((shotFrame) => (
        <DynamicShotBody
          key={shotFrame.shot!.id}
          shotFrame={shotFrame}
          robotLength={robotLength}
          bodyRef={(body) => {
            bodies.current[shotFrame.shot!.id] = body;
          }}
        />
      ))}
    </group>
  );
}

function RecordedShotArtifacts({ frame }: { frame: TelemetryFrame }) {
  const shots = frame.shots ?? [];

  return (
    <group>
      {shots.map((shot) => (
        <group key={shot.id} position={[shot.x, shot.y, shot.z]}>
          <ArtifactBallMesh color="purple" />
        </group>
      ))}
    </group>
  );
}

function ReferenceText({ children, ...props }: ReferenceTextProps) {
  const text = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!text.current) return;
    text.current.renderOrder = 2000;
    text.current.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.depthTest = false;
        material.depthWrite = false;
        material.transparent = true;
        material.needsUpdate = true;
      });
    });
  }, [children]);

  return (
    <Text ref={text} {...props} material-depthTest={false} material-depthWrite={false} renderOrder={2000}>
      {children}
    </Text>
  );
}

function MouseCoordinateTracker({
  enabled,
  coordinateSystem,
  onChange,
}: {
  enabled: boolean;
  coordinateSystem: CoordinateSystem;
  onChange: (coordinates: FieldMouseCoordinates) => void;
}) {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const fieldPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }

    const element = gl.domElement;
    const updateCoordinates = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      onChange(raycaster.ray.intersectPlane(fieldPlane, hit) ? displayCoordinatesFromWorld(hit, coordinateSystem) : null);
    };
    const clearCoordinates = () => onChange(null);

    element.addEventListener("pointermove", updateCoordinates);
    element.addEventListener("pointerleave", clearCoordinates);
    return () => {
      element.removeEventListener("pointermove", updateCoordinates);
      element.removeEventListener("pointerleave", clearCoordinates);
    };
  }, [camera, coordinateSystem, enabled, fieldPlane, gl.domElement, hit, onChange, pointer, raycaster]);

  return null;
}

function FieldReference3D({ coordinateSystem }: { coordinateSystem: CoordinateSystem }) {
  const labels = coordinateSystem === "center" ? [-72, -48, -24, 0, 24, 48, 72] : [0, 24, 48, 72, 96, 120, 144];
  const min = labels[0];
  const max = labels[labels.length - 1];
  const lineY = 0.072;
  const labelY = 0.16;
  const compassY = 0.112;
  const labelWallInset = 6;
  const cyan = "#39d6ff";
  const overlayRenderOrder = 1000;
  const compassLineWidth = 3.25;
  const labelRotation: [number, number, number] = [-Math.PI / 2, 0, 0];
  const toWorld = (displayX: number, displayY: number, y = lineY): [number, number, number] => {
    const fieldX = coordinateSystem === "center" ? displayX + 72 : displayX;
    const fieldY = coordinateSystem === "center" ? 72 - displayY : 144 - displayY;
    const [x, , z] = fieldPosition(fieldX, fieldY);
    return [x, y, z];
  };
  const compassPoints = Array.from({ length: 65 }, (_, index) => {
    const angle = index / 64 * Math.PI * 2;
    return [Math.cos(angle) * 0.35, compassY, Math.sin(angle) * 0.35] as [number, number, number];
  });
  const keepLabelOffWall = (value: number) => Math.min(max - labelWallInset, Math.max(min + labelWallInset, value));

  return (
    <group>
      {labels.map((label) => (
        <ReferenceText key={`label-x-${label}`} position={toWorld(keepLabelOffWall(label), min + labelWallInset, labelY)} rotation={labelRotation} fontSize={0.14} color="#f5fbff" anchorX="center" anchorY="middle" outlineWidth={0.014} outlineColor="#071014">
          {label}
        </ReferenceText>
      ))}
      {labels.map((label) => (
        <ReferenceText key={`label-y-${label}`} position={toWorld(min + labelWallInset, keepLabelOffWall(label), labelY)} rotation={labelRotation} fontSize={0.14} color="#f5fbff" anchorX="center" anchorY="middle" outlineWidth={0.014} outlineColor="#071014">
          {label}
        </ReferenceText>
      ))}

      <group position={[0, 0, 0]}>
        <Line points={[[-0.68, compassY, 0], [0.68, compassY, 0]]} color={cyan} lineWidth={compassLineWidth} depthTest={false} renderOrder={overlayRenderOrder} />
        <Line points={[[0, compassY, 0.68], [0, compassY, -0.68]]} color={cyan} lineWidth={compassLineWidth} depthTest={false} renderOrder={overlayRenderOrder} />
        <Line points={[[0.68, compassY, 0], [0.5, compassY, -0.15], [0.5, compassY, 0.15], [0.68, compassY, 0]]} color={cyan} lineWidth={compassLineWidth} depthTest={false} renderOrder={overlayRenderOrder} />
        <Line points={[[-0.68, compassY, 0], [-0.5, compassY, -0.15], [-0.5, compassY, 0.15], [-0.68, compassY, 0]]} color={cyan} lineWidth={compassLineWidth} depthTest={false} renderOrder={overlayRenderOrder} />
        <Line points={[[0, compassY, -0.68], [-0.15, compassY, -0.5], [0.15, compassY, -0.5], [0, compassY, -0.68]]} color={cyan} lineWidth={compassLineWidth} depthTest={false} renderOrder={overlayRenderOrder} />
        <Line points={[[0, compassY, 0.68], [-0.15, compassY, 0.5], [0.15, compassY, 0.5], [0, compassY, 0.68]]} color={cyan} lineWidth={compassLineWidth} depthTest={false} renderOrder={overlayRenderOrder} />
        <Line points={compassPoints} color={cyan} lineWidth={compassLineWidth} depthTest={false} renderOrder={overlayRenderOrder} />
        {[
          { label: "0°", position: [0.86, labelY, 0] as [number, number, number] },
          { label: "90°", position: [0, labelY, -0.87] as [number, number, number] },
          { label: "180°", position: [-0.9, labelY, 0] as [number, number, number] },
          { label: "270°", position: [0, labelY, 0.9] as [number, number, number] },
        ].map(({ label, position }) => (
          <ReferenceText key={label} position={position} rotation={labelRotation} fontSize={0.19} color="#f5fbff" anchorX="center" anchorY="middle" outlineWidth={0.014} outlineColor="#071014">
            {label}
          </ReferenceText>
        ))}
      </group>
    </group>
  );
}

function Scene(props: FieldScene3DProps & { showReference: boolean; onMouseCoordinates: (coordinates: FieldMouseCoordinates) => void }) {
  return (
    <>
      <color attach="background" args={["#080c11"]} />
      <ambientLight intensity={1.35} />
      <hemisphereLight args={["#dcecff", "#26313a", 1.8]} />
      <directionalLight position={[3.5, 6, 3]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-4, 3.5, -3]} intensity={1.2} color="#d8e7ff" />
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} interpolate>
        <DecodeFieldModel />
        <FieldBounds />
        <Robot key={`${props.robotId}-${props.robotWidth}-${props.robotLength}`} frame={props.frame} width={props.robotWidth} length={props.robotLength} running={props.running} allianceColor={props.allianceColor} />
        {props.recordingPhysics && (
          <>
            <DynamicArtifactsRecorder
              frame={props.frame}
              selectedRows={props.selectedArtifactRows}
              initialArtifacts={props.frame.artifacts}
              robotWidth={props.robotWidth}
              robotLength={props.robotLength}
              frameIndex={props.frameIndex}
              resetSignal={props.ballResetSignal}
              onRecord={props.onPhysicsArtifacts}
              onCollect={props.onPhysicsArtifactCollected}
            />
            <DynamicShotsRecorder
              frame={props.frame}
              trail={props.trail}
              robotLength={props.robotLength}
              robotWidth={props.robotWidth}
              frameIndex={props.frameIndex}
              resetSignal={props.ballResetSignal}
              onRecord={props.onPhysicsShots}
              onCollect={props.onPhysicsArtifactCollected}
            />
          </>
        )}
      </Physics>
      {!props.recordingPhysics && props.frame.time > 0 && (
        <FieldArtifacts
          frame={props.frame}
          selectedRows={props.selectedArtifactRows}
        />
      )}
      {!props.recordingPhysics && <RecordedShotArtifacts frame={props.frame} />}
      {!props.running && props.frame.time === 0 && <ArtifactSetupMarkers selectedRows={props.selectedArtifactRows} />}
      {props.showReference && <FieldReference3D coordinateSystem={props.coordinateSystem} />}
      {props.showRobotTrail && props.trail.length > 0 && <RobotTrail trail={props.trail} />}
      <MouseCoordinateTracker enabled={props.showReference} coordinateSystem={props.coordinateSystem} onChange={props.onMouseCoordinates} />
      <OrbitControls makeDefault target={[0, 0, 0]} minDistance={3.2} maxDistance={8} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.1} enableDamping />
    </>
  );
}

export function FieldScene3D(props: FieldScene3DProps) {
  const [showReference, setShowReference] = useState(false);
  const [mouseCoordinates, setMouseCoordinates] = useState<FieldMouseCoordinates>(null);

  return (
    <div className="field-scene-3d" aria-label="Interactive 3D DECODE field simulation">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [4.5, 4.6, 5.2], fov: 42, near: 0.1, far: 50 }}>
        <Suspense fallback={null}><Scene {...props} showReference={showReference} onMouseCoordinates={setMouseCoordinates} /></Suspense>
      </Canvas>
      <button type="button" className={`field-reference-toggle ${showReference ? "active" : ""}`} onClick={() => setShowReference((current) => !current)}>
        Field compass
      </button>
      {showReference && (
        <div className="field-coordinate-readout" aria-live="polite">
          <span>Mouse</span>
          <b>{mouseCoordinates ? `X ${mouseCoordinates.x.toFixed(1)} in` : "X --"}</b>
          <b>{mouseCoordinates ? `Y ${mouseCoordinates.y.toFixed(1)} in` : "Y --"}</b>
        </div>
      )}
      <div className="field-camera-hint">Drag to orbit · Scroll to zoom</div>
    </div>
  );
}

useGLTF.preload("/models/fields/decode-field.glb");
