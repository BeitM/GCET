"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { AllianceColor, TelemetryFrame } from "@/lib/types";
import type { MotorId, RobotMotorPowers } from "@/lib/motors";
import { stoppedMotorPowers } from "@/lib/motors";

type ShooterRobotModelProps = {
  frame: TelemetryFrame;
  width: number;
  length: number;
  running: boolean;
  allianceColor: AllianceColor;
};

const MODEL_FOOTPRINT_METERS = 0.4318;
const aluminum = "#aebac0";
const motorGold = "#d7a22e";
const rotationDecal = "#f4df5d";
const shellTint: Record<AllianceColor, string> = {
  blue: "#7babb7",
  red: "#b77b82",
};

function MotorCan({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.027, 0.027, 0.07, 22]} />
        <meshStandardMaterial color={motorGold} metalness={0.62} roughness={0.33} />
      </mesh>
      <mesh position={[0, 0.045, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.024, 0.022, 22]} />
        <meshStandardMaterial color="#808d93" metalness={0.86} roughness={0.24} />
      </mesh>
      <mesh position={[0, -0.044, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.018, 22]} />
        <meshStandardMaterial color="#252e32" metalness={0.35} roughness={0.55} />
      </mesh>
    </group>
  );
}

function RotationDecal({ face, radius }: { face: number; radius: number }) {
  return (
    <mesh position={[face, 0, 0]} castShadow>
      <boxGeometry args={[0.003, 0.01, radius * 1.68]} />
      <meshStandardMaterial color={rotationDecal} emissive="#594d09" emissiveIntensity={0.45} roughness={0.5} />
    </mesh>
  );
}

function DriveWheel({
  position,
  power,
}: {
  position: [number, number, number];
  power: number;
}) {
  const wheel = useRef<THREE.Group>(null);
  const side = Math.sign(position[0]);

  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.x += power * delta * 11;
  });

  return (
    <group>
      <group ref={wheel} position={position}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.052, 0.052, 0.038, 30]} />
          <meshStandardMaterial color="#11171a" roughness={0.78} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.043, 22]} />
          <meshStandardMaterial color={aluminum} metalness={0.84} roughness={0.25} />
        </mesh>
        <RotationDecal face={-0.0215} radius={0.052} />
        <RotationDecal face={0.0215} radius={0.052} />
      </group>
      <MotorCan position={[position[0] - side * 0.073, position[1], position[2]]} />
    </group>
  );
}

function IntakeAssembly({ power }: { power: number }) {
  const rollers = useRef<Array<THREE.Group | null>>([]);
  const brush = useRef<THREE.Group>(null);
  const rollerSpecs = [
    { y: 0.064, z: -0.27, radius: 0.029 },
    { y: 0.116, z: -0.224, radius: 0.027 },
    { y: 0.164, z: -0.174, radius: 0.025 },
  ];

  useFrame((_, delta) => {
    rollers.current.forEach((roller, index) => {
      if (roller) roller.rotation.x += power * delta * (13 + index * 1.5);
    });
    if (brush.current) brush.current.rotation.x += power * delta * 17;
  });

  return (
    <group>
      {rollerSpecs.map((roller, index) => (
        <group
          key={roller.z}
          ref={(node) => {
            rollers.current[index] = node;
          }}
          position={[0, roller.y, roller.z]}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[roller.radius, roller.radius, 0.36, 24]} />
            <meshStandardMaterial color="#26343a" roughness={0.7} />
          </mesh>
          <RotationDecal face={-0.1815} radius={roller.radius} />
          <RotationDecal face={0.1815} radius={roller.radius} />
        </group>
      ))}

      <group ref={brush} position={[0, 0.197, -0.129]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 0.35, 24]} />
          <meshStandardMaterial color="#5c4775" roughness={0.68} />
        </mesh>
        <RotationDecal face={-0.1765} radius={0.038} />
        <RotationDecal face={0.1765} radius={0.038} />
      </group>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.19, 0.123, -0.205]} rotation={[-0.78, 0, 0]} castShadow>
          <boxGeometry args={[0.019, 0.035, 0.25]} />
          <meshStandardMaterial color="#829097" metalness={0.68} roughness={0.33} />
        </mesh>
      ))}
      <MotorCan position={[0.204, 0.151, -0.171]} />
    </group>
  );
}

function Flywheel({
  position,
  power,
  wheelRef,
}: {
  position: [number, number, number];
  power: number;
  wheelRef: React.RefObject<THREE.Group | null>;
}) {
  useFrame((_, delta) => {
    if (wheelRef.current) wheelRef.current.rotation.x += power * delta * 23;
  });

  return (
    <group ref={wheelRef} position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.036, 36]} />
        <meshStandardMaterial color="#20282c" roughness={0.55} />
      </mesh>
      <RotationDecal face={-0.019} radius={0.062} />
      <RotationDecal face={0.019} radius={0.062} />
    </group>
  );
}

function ShooterTurret({
  frame,
  powers,
  running,
}: {
  frame: TelemetryFrame;
  powers: RobotMotorPowers;
  running: boolean;
}) {
  const turret = useRef<THREE.Group>(null);
  const leftFlywheel = useRef<THREE.Group>(null);
  const rightFlywheel = useRef<THREE.Group>(null);
  const feeder = useRef<THREE.Group>(null);
  const hood = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (turret.current) turret.current.rotation.y += powers.turret * delta * 1.25;
    if (feeder.current && running && frame.feeder) feeder.current.rotation.x += delta * 14;
    if (hood.current) {
      const target = -0.12 - THREE.MathUtils.clamp(frame.shooterRpm / 6000, 0, 1) * 0.42;
      hood.current.rotation.x = THREE.MathUtils.lerp(hood.current.rotation.x, target, 1 - Math.exp(-delta * 7));
    }
  });

  return (
    <group position={[0, 0.205, 0.08]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.145, 0.145, 0.026, 44]} />
        <meshStandardMaterial color="#263238" metalness={0.58} roughness={0.38} />
      </mesh>

      <group ref={turret} position={[0, 0.025, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.018, 40]} />
          <meshStandardMaterial color="#35444a" metalness={0.53} roughness={0.4} />
        </mesh>

        <Flywheel position={[-0.072, 0.188, -0.026]} power={powers.flywheelLeft} wheelRef={leftFlywheel} />
        <Flywheel position={[0.072, 0.188, -0.026]} power={powers.flywheelRight} wheelRef={rightFlywheel} />
        <MotorCan position={[-0.142, 0.188, 0.032]} />
        <MotorCan position={[0.142, 0.188, 0.032]} />

        <group ref={feeder} position={[0, 0.086, 0.07]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.033, 0.033, 0.17, 22]} />
            <meshStandardMaterial color="#8f5ccc" roughness={0.6} />
          </mesh>
        </group>

        <group ref={hood} position={[0, 0.13, -0.038]}>
          {[0, 1, 2].map((segment) => (
            <mesh key={segment} position={[0, segment * 0.037, -segment * 0.024]} rotation={[-0.16 - segment * 0.17, 0, 0]} castShadow>
              <boxGeometry args={[0.205, 0.012, 0.08]} />
              <meshStandardMaterial color="#d6dfe2" metalness={0.5} roughness={0.35} />
            </mesh>
          ))}
        </group>

        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.115, 0.122, 0.012]} rotation={[-0.1, 0, 0]} castShadow>
            <boxGeometry args={[0.013, 0.24, 0.21]} />
            <meshStandardMaterial color={aluminum} metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>

      <MotorCan position={[0.156, 0.055, 0.026]} />
      <mesh position={[0.116, 0.055, 0.026]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.034, 0.034, 0.035, 26]} />
        <meshStandardMaterial color="#65737a" metalness={0.78} roughness={0.28} />
      </mesh>
    </group>
  );
}

function SimplifiedShell({ allianceColor }: { allianceColor: AllianceColor }) {
  const panelMaterial = (
    <meshPhysicalMaterial
      color={shellTint[allianceColor]}
      metalness={0.08}
      roughness={0.28}
      transparent
      opacity={0.23}
      transmission={0.18}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  );

  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.188, 0.286, 0.045]} castShadow>
            <boxGeometry args={[0.012, 0.29, 0.31]} />
            {panelMaterial}
          </mesh>
          <mesh position={[side * 0.171, 0.222, -0.145]} rotation={[0, side * 0.08, -side * 0.1]} castShadow>
            <boxGeometry args={[0.012, 0.19, 0.18]} />
            {panelMaterial}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.252, 0.206]} rotation={[0.16, 0, 0]} castShadow>
        <boxGeometry args={[0.35, 0.23, 0.012]} />
        {panelMaterial}
      </mesh>
    </group>
  );
}

export function ShooterRobotModel({ frame, width, length, running, allianceColor }: ShooterRobotModelProps) {
  const scale = Math.min(width, length) / MODEL_FOOTPRINT_METERS;
  const powers = running ? frame.motorPowers : stoppedMotorPowers;
  const motorPower = (id: MotorId) => powers[id];

  return (
    <group position={[0, -0.13 * scale, 0]} scale={scale}>
      <mesh position={[0, 0.105, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.405, 0.035, 0.405]} />
        <meshStandardMaterial color="#111a1f" metalness={0.34} roughness={0.56} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={`side-${side}`} position={[side * 0.193, 0.13, 0]} castShadow>
          <boxGeometry args={[0.035, 0.055, 0.43]} />
          <meshStandardMaterial color={aluminum} metalness={0.84} roughness={0.25} />
        </mesh>
      ))}
      {[-1, 1].map((end) => (
        <mesh key={`end-${end}`} position={[0, 0.13, end * 0.198]} castShadow>
          <boxGeometry args={[0.39, 0.055, 0.035]} />
          <meshStandardMaterial color={aluminum} metalness={0.84} roughness={0.25} />
        </mesh>
      ))}

      <DriveWheel position={[-0.218, 0.075, -0.146]} power={motorPower("frontLeftDrive")} />
      <DriveWheel position={[0.218, 0.075, -0.146]} power={motorPower("frontRightDrive")} />
      <DriveWheel position={[-0.218, 0.075, 0.146]} power={motorPower("rearLeftDrive")} />
      <DriveWheel position={[0.218, 0.075, 0.146]} power={motorPower("rearRightDrive")} />

      <IntakeAssembly power={motorPower("intake")} />
      <ShooterTurret frame={frame} powers={powers} running={running} />
      <SimplifiedShell allianceColor={allianceColor} />
    </group>
  );
}
