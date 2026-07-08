"use client";

import { Line, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { CuboidCollider, Physics, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TelemetryFrame } from "@/lib/types";

const INCHES_TO_METERS = 0.0254;
const FIELD_INCHES = 144;
const FIELD_METERS = FIELD_INCHES * INCHES_TO_METERS;

type FieldScene3DProps = {
  frame: TelemetryFrame;
  trail: TelemetryFrame[];
  robotWidth: number;
  robotLength: number;
};

function fieldPosition(x: number, y: number): [number, number, number] {
  return [(x - 72) * INCHES_TO_METERS, 0, (y - 72) * INCHES_TO_METERS];
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

  return <primitive object={model} position={[0, 0.031, 0]} rotation={[0, Math.PI, 0]} />;
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

      <FlatTape from={fieldPercent(43, 3.7)} to={fieldPercent(83, 3.7)} color="#3437a5" />
      <FlatTape from={fieldPercent(48.6, 84)} to={fieldPercent(48.6, 91)} color="#3437a5" />
      <FlatTape from={fieldPercent(50.4, 84)} to={fieldPercent(50.4, 91)} color="#3437a5" />
      <FlatTape from={fieldPercent(43, 96.3)} to={fieldPercent(83, 96.3)} color="#ed2532" />
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

function Robot({ frame, width, length }: { frame: TelemetryFrame; width: number; length: number }) {
  const body = useRef<RapierRigidBody>(null);
  const widthMeters = width * INCHES_TO_METERS;
  const lengthMeters = length * INCHES_TO_METERS;
  const position = fieldPosition(frame.x, frame.y);

  useFrame(() => {
    body.current?.setNextKinematicTranslation({ x: position[0], y: 0.12, z: position[2] });
    body.current?.setNextKinematicRotation(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(frame.heading), 0)),
    );
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[position[0], 0.12, position[2]]} canSleep={false}>
      <CuboidCollider args={[widthMeters / 2, 0.1, lengthMeters / 2]} friction={1.2} />
      <mesh castShadow>
        <boxGeometry args={[widthMeters, 0.2, lengthMeters]} />
        <meshStandardMaterial color="#123c42" emissive="#16b8b2" emissiveIntensity={0.25} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.112, -lengthMeters * 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[Math.min(widthMeters, lengthMeters) * 0.16, 0.2, 3]} />
        <meshStandardMaterial color="#d9fffd" emissive="#25e0da" emissiveIntensity={0.5} />
      </mesh>
      {[-1, 1].flatMap((side) => [-1, 1].map((end) => (
        <mesh key={`${side}-${end}`} position={[side * (widthMeters / 2 + 0.025), -0.015, end * lengthMeters * 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 20]} />
          <meshStandardMaterial color="#687781" roughness={0.75} />
        </mesh>
      )))}
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

function Scene(props: FieldScene3DProps) {
  return (
    <>
      <color attach="background" args={["#080c11"]} />
      <ambientLight intensity={1.35} />
      <hemisphereLight args={["#dcecff", "#26313a", 1.8]} />
      <directionalLight position={[3.5, 6, 3]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-4, 3.5, -3]} intensity={1.2} color="#d8e7ff" />
      <DecodeFieldModel />
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60} interpolate>
        <FieldBounds />
        <Robot key={`${props.robotWidth}-${props.robotLength}`} frame={props.frame} width={props.robotWidth} length={props.robotLength} />
      </Physics>
      <RobotTrail trail={props.trail} />
      <OrbitControls makeDefault target={[0, 0, 0]} minDistance={3.2} maxDistance={8} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.1} enableDamping />
    </>
  );
}

export function FieldScene3D(props: FieldScene3DProps) {
  return (
    <div className="field-scene-3d" aria-label="Interactive 3D DECODE field simulation">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [4.5, 4.6, 5.2], fov: 42, near: 0.1, far: 50 }}>
        <Suspense fallback={null}><Scene {...props} /></Suspense>
      </Canvas>
      <div className="field-camera-hint">Drag to orbit · Scroll to zoom</div>
    </div>
  );
}

useGLTF.preload("/models/fields/decode-field.glb");
