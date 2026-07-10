"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { AllianceColor, TelemetryFrame } from "@/lib/types";

type ShooterRobotModelProps = {
  frame: TelemetryFrame;
  width: number;
  length: number;
  running: boolean;
  allianceColor: AllianceColor;
};

const aluminum = "#a9b5ba";
const darkMetal = "#172126";
const motorYellow = "#d9a12e";
const allianceAccent = {
  blue: { color: "#527dff", emissive: "#1e397c" },
  red: { color: "#ff4d5e", emissive: "#7f1722" },
};

function MecanumModule({
  position,
  rollerDirection,
  power,
  accentColor,
}: {
  position: [number, number, number];
  rollerDirection: 1 | -1;
  power: number;
  accentColor: string;
}) {
  const wheel = useRef<THREE.Group>(null);
  const radius = 0.05;

  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.x += power * delta * 12;
  });

  return (
    <group position={position}>
      <mesh position={[-Math.sign(position[0]) * 0.043, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.026, 0.026, 0.065, 20]} />
        <meshStandardMaterial color={motorYellow} metalness={0.58} roughness={0.35} />
      </mesh>
      <group ref={wheel}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[radius, radius, 0.034, 28]} />
          <meshStandardMaterial color="#12181b" roughness={0.78} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.021, 0.021, 0.039, 20]} />
          <meshStandardMaterial color={aluminum} metalness={0.84} roughness={0.25} />
        </mesh>
        {Array.from({ length: 9 }, (_, index) => {
          const angle = index * Math.PI * 2 / 9;
          return (
            <mesh
              key={index}
              position={[0, Math.sin(angle) * radius, Math.cos(angle) * radius]}
              rotation={[angle, 0, rollerDirection * 0.58]}
              castShadow
            >
              <capsuleGeometry args={[0.007, 0.025, 4, 8]} />
              <meshStandardMaterial color={accentColor} roughness={0.72} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function PoweredRoller({
  position,
  radius,
  active,
  accentColor,
}: {
  position: [number, number, number];
  radius: number;
  active: boolean;
  accentColor: string;
}) {
  const roller = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (roller.current && active) roller.current.rotation.x += delta * 15;
  });

  return (
    <group position={position}>
      <group ref={roller}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[radius, radius, 0.29, 24]} />
          <meshStandardMaterial color="#28353a" roughness={0.7} />
        </mesh>
        {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[radius + 0.003, 0.006, 8, 18]} />
            <meshStandardMaterial color={accentColor} roughness={0.65} />
          </mesh>
        ))}
      </group>
      <mesh position={[0.175, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.023, 0.023, 0.055, 18]} />
        <meshStandardMaterial color={motorYellow} metalness={0.55} roughness={0.36} />
      </mesh>
    </group>
  );
}

function TurretAssembly({ frame, running, accentColor, emissiveColor }: { frame: TelemetryFrame; running: boolean; accentColor: string; emissiveColor: string }) {
  const turret = useRef<THREE.Group>(null);
  const flywheel = useRef<THREE.Group>(null);
  const feeder = useRef<THREE.Group>(null);
  const hood = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (turret.current) turret.current.rotation.y = 0;

    if (flywheel.current && running) {
      flywheel.current.rotation.x += frame.shooterRpm * (Math.PI * 2 / 60) * delta;
    }

    if (feeder.current && running && frame.feeder) {
      feeder.current.rotation.x += delta * 14;
    }

    if (hood.current) {
      const rpmRatio = THREE.MathUtils.clamp(frame.shooterRpm / 3600, 0, 1);
      const target = 0.04 + rpmRatio * 0.16;
      hood.current.rotation.x = THREE.MathUtils.lerp(
        hood.current.rotation.x,
        target,
        1 - Math.exp(-delta * 6),
      );
    }
  });

  return (
    <group position={[0, 0, 0.055]}>
      <mesh position={[0, 0.065, 0]} castShadow>
        <cylinderGeometry args={[0.142, 0.142, 0.026, 48]} />
        <meshStandardMaterial color="#222e33" metalness={0.65} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.122, 0.008, 10, 48]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={0.28} metalness={0.4} roughness={0.4} />
      </mesh>

      <group position={[0.137, 0.06, 0.025]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.065, 18]} />
          <meshStandardMaterial color={motorYellow} metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[-0.036, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.024, 0.012, 18]} />
          <meshStandardMaterial color="#87949a" metalness={0.78} roughness={0.3} />
        </mesh>
      </group>

      <group ref={turret} position={[0, 0.083, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.118, 0.118, 0.016, 40]} />
          <meshStandardMaterial color="#37454b" metalness={0.52} roughness={0.4} />
        </mesh>

        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.122, 0.105, 0.018]} rotation={[-0.08, 0, 0]} castShadow>
              <boxGeometry args={[0.014, 0.205, 0.19]} />
              <meshStandardMaterial color={aluminum} metalness={0.72} roughness={0.3} />
            </mesh>
            <mesh position={[side * 0.122, 0.025, -0.035]} castShadow>
              <boxGeometry args={[0.028, 0.045, 0.075]} />
              <meshStandardMaterial color="#26343a" metalness={0.44} roughness={0.48} />
            </mesh>
          </group>
        ))}

        <group ref={feeder} position={[0, 0.055, -0.035]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.034, 0.034, 0.18, 20]} />
            <meshStandardMaterial color="#8f5ccc" roughness={0.6} />
          </mesh>
          {[0, Math.PI / 2].map((angle) => (
            <mesh key={angle} rotation={[angle, 0, 0]} castShadow>
              <boxGeometry args={[0.19, 0.012, 0.012]} />
              <meshStandardMaterial color="#d6c4ec" roughness={0.5} />
            </mesh>
          ))}
        </group>

        <mesh position={[0, 0.125, -0.018]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.205, 0.012, 0.17]} />
          <meshStandardMaterial color="#3a484e" metalness={0.4} roughness={0.48} />
        </mesh>

        <group ref={flywheel} position={[0, 0.19, 0.055]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.061, 0.061, 0.056, 36]} />
            <meshStandardMaterial color="#242c30" roughness={0.58} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.019, 0.019, 0.064, 20]} />
            <meshStandardMaterial color={motorYellow} metalness={0.48} roughness={0.36} />
          </mesh>
        </group>
        <mesh position={[0.095, 0.19, 0.055]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.1, 20]} />
          <meshStandardMaterial color={motorYellow} metalness={0.58} roughness={0.34} />
        </mesh>

        <group ref={hood} position={[0, 0.115, 0.025]}>
          {[
            { y: 0.018, z: 0.04, angle: -0.18 },
            { y: 0.055, z: 0.075, angle: -0.42 },
            { y: 0.09, z: 0.092, angle: -0.66 },
          ].map((segment) => (
            <mesh key={segment.y} position={[0, segment.y, segment.z]} rotation={[segment.angle, 0, 0]} castShadow>
              <boxGeometry args={[0.205, 0.012, 0.075]} />
              <meshStandardMaterial color="#d5dde0" metalness={0.54} roughness={0.34} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.105, 0.055, 0.065]} rotation={[-0.42, 0, 0]} castShadow>
              <boxGeometry args={[0.012, 0.11, 0.11]} />
              <meshStandardMaterial color="#6d7c83" metalness={0.62} roughness={0.34} />
            </mesh>
          ))}
        </group>

        <group position={[-0.142, 0.12, 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.055, 0.075]} />
            <meshStandardMaterial color="#222b30" roughness={0.52} />
          </mesh>
          <mesh position={[0.024, 0, 0.025]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.019, 0.019, 0.01, 16]} />
            <meshStandardMaterial color="#e5edf0" metalness={0.7} roughness={0.27} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function ShooterRobotModel({ frame, width, length, running, allianceColor }: ShooterRobotModelProps) {
  const wheelX = width / 2 - 0.017;
  const wheelZ = length / 2 - 0.065;
  const railX = width / 2 - 0.035;
  const intakeActive = running && frame.intake !== "off";
  const alliance = allianceAccent[allianceColor];

  return (
    <group>
      <mesh position={[0, -0.044, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.075, 0.026, length - 0.075]} />
        <meshStandardMaterial color="#172329" metalness={0.36} roughness={0.56} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * railX, -0.012, 0]} castShadow>
          <boxGeometry args={[0.046, 0.065, length - 0.035]} />
          <meshStandardMaterial color={aluminum} metalness={0.84} roughness={0.25} />
        </mesh>
      ))}
      {[-1, 1].map((end) => (
        <mesh key={end} position={[0, -0.012, end * (length / 2 - 0.035)]} castShadow>
          <boxGeometry args={[width - 0.055, 0.065, 0.046]} />
          <meshStandardMaterial color={aluminum} metalness={0.84} roughness={0.25} />
        </mesh>
      ))}

      <MecanumModule position={[-wheelX, -0.055, -wheelZ]} rollerDirection={1} power={running ? frame.leftPower : 0} accentColor={alliance.color} />
      <MecanumModule position={[wheelX, -0.055, -wheelZ]} rollerDirection={-1} power={running ? frame.rightPower : 0} accentColor={alliance.color} />
      <MecanumModule position={[-wheelX, -0.055, wheelZ]} rollerDirection={-1} power={running ? frame.leftPower : 0} accentColor={alliance.color} />
      <MecanumModule position={[wheelX, -0.055, wheelZ]} rollerDirection={1} power={running ? frame.rightPower : 0} accentColor={alliance.color} />

      <PoweredRoller position={[0, -0.035, -length / 2 + 0.028]} radius={0.027} active={intakeActive} accentColor={alliance.color} />
      <PoweredRoller position={[0, 0.02, -length / 2 + 0.092]} radius={0.024} active={intakeActive} accentColor={alliance.color} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.16, 0.035, -0.13]} rotation={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.022, 0.035, 0.29]} />
          <meshStandardMaterial color="#71838b" metalness={0.62} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.045, -0.12]} rotation={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.27, 0.012, 0.28]} />
        <meshStandardMaterial color="#324248" metalness={0.3} roughness={0.52} />
      </mesh>

      <mesh position={[-0.105, 0.03, 0.135]} castShadow>
        <boxGeometry args={[0.115, 0.06, 0.12]} />
        <meshStandardMaterial color={darkMetal} roughness={0.58} />
      </mesh>
      <mesh position={[-0.105, 0.064, 0.135]}>
        <boxGeometry args={[0.085, 0.008, 0.085]} />
        <meshStandardMaterial color={alliance.color} emissive={alliance.emissive} emissiveIntensity={0.26} />
      </mesh>

      <TurretAssembly frame={frame} running={running} accentColor={alliance.color} emissiveColor={alliance.emissive} />

      <mesh position={[0, 0.072, -length * 0.24]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.034, 0.068, 3]} />
        <meshStandardMaterial color="#efffff" emissive={alliance.color} emissiveIntensity={0.42} />
      </mesh>
    </group>
  );
}
