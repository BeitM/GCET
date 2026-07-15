"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { AllianceColor } from "@/lib/types";
import type { MotorId, RobotMotorPowers } from "@/lib/motors";

type DecodeRobotModelProps = {
  powers: RobotMotorPowers;
  feederPosition: number;
  hoodPosition: number;
  selectedMotor?: MotorId | null;
  onSelect?: (id: MotorId) => void;
  allianceColor?: AllianceColor;
};

const aluminum = "#aeb6b9";
const darkAluminum = "#616a6e";
const motorGold = "#d7a22e";
const wheelGold = "#d6a800";
const intakeBlue = "#3b8ed0";
const shooterBlue = "#272c78";
const feederRed = "#c9362a";
const mecanumWheelRadius = 0.048;

function selectMotor(event: ThreeEvent<PointerEvent>, id: MotorId, onSelect?: (id: MotorId) => void) {
  if (!onSelect) return;
  event.stopPropagation();
  onSelect(id);
}

function MotorCan({
  position,
  selected = false,
}: {
  position: [number, number, number];
  selected?: boolean;
}) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.065, 18]} />
        <meshStandardMaterial
          color={motorGold}
          emissive={selected ? "#6d4b08" : "#000000"}
          emissiveIntensity={selected ? 0.75 : 0}
          metalness={0.62}
          roughness={0.34}
        />
      </mesh>
      <mesh position={[0, 0.041, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.018, 18]} />
        <meshStandardMaterial color="#7d898e" metalness={0.82} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.041, 0]} castShadow>
        <cylinderGeometry args={[0.026, 0.026, 0.017, 18]} />
        <meshStandardMaterial color="#252b2e" metalness={0.3} roughness={0.58} />
      </mesh>
    </group>
  );
}

function MecanumRollers({ handedness }: { handedness: number }) {
  const rollers = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!rollers.current) return;
    const transform = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3();

    for (let index = 0; index < 9; index += 1) {
      const angle = index / 9 * Math.PI * 2;
      transform.position.set(0, Math.sin(angle) * (mecanumWheelRadius - 0.0075), Math.cos(angle) * (mecanumWheelRadius - 0.0075));
      direction.set(handedness * 0.72, Math.cos(angle) * 0.69, -Math.sin(angle) * 0.69).normalize();
      transform.quaternion.setFromUnitVectors(up, direction);
      transform.updateMatrix();
      rollers.current.setMatrixAt(index, transform.matrix);
    }
    rollers.current.instanceMatrix.needsUpdate = true;
  }, [handedness]);

  return (
    <instancedMesh ref={rollers} args={[undefined, undefined, 9]} castShadow>
      <cylinderGeometry args={[0.0075, 0.0075, 0.068, 8]} />
      <meshStandardMaterial color="#30383b" metalness={0.08} roughness={0.88} />
    </instancedMesh>
  );
}

function MecanumWheel({
  id,
  position,
  power,
  selected,
  onSelect,
}: {
  id: MotorId;
  position: [number, number, number];
  power: number;
  selected: boolean;
  onSelect?: (id: MotorId) => void;
}) {
  const wheel = useRef<THREE.Group>(null);
  const side = Math.sign(position[0]);
  const rollerHandedness = id === "frontLeftDrive" || id === "rearRightDrive" ? 1 : -1;

  useFrame((_, delta) => {
    // Positive drive power moves the robot toward its front (-Z), so the
    // wheel surface at the floor must travel toward +Z.
    if (wheel.current) wheel.current.rotation.x -= power * delta * 11;
  });

  return (
    <group onPointerDown={(event) => selectMotor(event, id, onSelect)}>
      <group ref={wheel} position={position}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.032, 0.032, 0.038, 24]} />
          <meshStandardMaterial
            color={wheelGold}
            emissive={selected ? "#174d4b" : "#000000"}
            emissiveIntensity={selected ? 0.55 : 0}
            metalness={0.35}
            roughness={0.5}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.049, 20]} />
          <meshStandardMaterial color="#596166" metalness={0.72} roughness={0.28} />
        </mesh>
        {[-1, 1].map((face) => (
          <mesh key={face} position={[face * 0.022, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.034, 0.0035, 7, 24]} />
            <meshStandardMaterial color={wheelGold} metalness={0.38} roughness={0.48} />
          </mesh>
        ))}
        <MecanumRollers handedness={rollerHandedness} />
      </group>
      <MotorCan position={[position[0] - side * 0.068, position[1], position[2]]} selected={selected} />
    </group>
  );
}

function FrameBar({
  x,
  y,
  z,
  length,
  angle = 0,
  thickness = 0.014,
}: {
  x: number;
  y: number;
  z: number;
  length: number;
  angle?: number;
  thickness?: number;
}) {
  return (
    <mesh position={[x, y, z]} rotation={[angle, 0, 0]} castShadow>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
    </mesh>
  );
}

function RearCrossBrace({ angle }: { angle: number }) {
  return (
    <mesh position={[0, 0.19, 0.211]} rotation={[0, 0, angle]} castShadow>
      <boxGeometry args={[0.016, 0.472, 0.016]} />
      <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
    </mesh>
  );
}

function TrussChassis({ allianceColor }: { allianceColor: AllianceColor }) {
  const plateColor = allianceColor === "red" ? "#571f29" : "#20275d";

  return (
    <group>
      <mesh position={[0, 0.078, 0.012]} castShadow receiveShadow>
        <boxGeometry args={[0.405, 0.035, 0.405]} />
        <meshStandardMaterial color="#12191c" metalness={0.32} roughness={0.6} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.205, 0.055, 0]} castShadow>
            <boxGeometry args={[0.013, 0.018, 0.43]} />
            <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
          </mesh>
          <mesh position={[side * 0.205, 0.19, 0]} castShadow>
            <boxGeometry args={[0.013, 0.016, 0.43]} />
            <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
          </mesh>
          <mesh position={[side * 0.205, 0.326, 0]} castShadow>
            <boxGeometry args={[0.013, 0.018, 0.43]} />
            <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
          </mesh>
          <FrameBar x={side * 0.205} y={0.19} z={-0.205} length={0.29} />
          <FrameBar x={side * 0.205} y={0.19} z={0.205} length={0.29} />
          <FrameBar x={side * 0.205} y={0.265} z={-0.105} length={0.225} angle={0.9} />
          <FrameBar x={side * 0.205} y={0.265} z={0.105} length={0.225} angle={-0.9} />
          <FrameBar x={side * 0.205} y={0.122} z={-0.105} length={0.21} angle={0.92} />
          <FrameBar x={side * 0.205} y={0.122} z={0.105} length={0.21} angle={-0.92} />

          <mesh position={[side * 0.212, 0.225, 0]} rotation={[0, side * Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.195, 0.07, 0.008]} />
            <meshStandardMaterial color={plateColor} metalness={0.18} roughness={0.55} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((end) => (
        <group key={end}>
          <mesh position={[0, 0.055, end * 0.205]} castShadow>
            <boxGeometry args={[0.42, 0.018, 0.013]} />
            <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
          </mesh>
          <mesh position={[0, 0.326, end * 0.205]} castShadow>
            <boxGeometry args={[0.42, 0.018, 0.013]} />
            <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.19, 0.211]} castShadow>
        <boxGeometry args={[0.42, 0.016, 0.016]} />
        <meshStandardMaterial color={aluminum} metalness={0.78} roughness={0.29} />
      </mesh>
      <RearCrossBrace angle={0.988} />
      <RearCrossBrace angle={-0.988} />
      <mesh position={[0, 0.125, 0.216]} castShadow>
        <boxGeometry args={[0.245, 0.105, 0.012]} />
        <meshStandardMaterial color="#222a2d" metalness={0.38} roughness={0.56} />
      </mesh>
    </group>
  );
}

function IntakeAssembly({
  power,
  selected,
  onSelect,
}: {
  power: number;
  selected: boolean;
  onSelect?: (id: MotorId) => void;
}) {
  const shafts = useRef<Array<THREE.Group | null>>([]);
  const transferShafts = [
    { y: 0.205, z: -0.155, radius: 0.018 },
    { y: 0.238, z: -0.07, radius: 0.017 },
  ];

  useFrame((_, delta) => {
    shafts.current.forEach((shaft, index) => {
      // Positive intake power carries the contact surface from the front
      // of the robot toward the internal transfer path (+Z).
      if (shaft) shaft.rotation.x -= power * delta * (13 + index * 1.5);
    });
  });

  return (
    <group onPointerDown={(event) => selectMotor(event, "intake", onSelect)}>
      <group
        ref={(node) => {
          shafts.current[0] = node;
        }}
        position={[0, 0.19, -0.255]}
      >
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.34, 16]} />
          <meshStandardMaterial color="#8c989d" metalness={0.66} roughness={0.34} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh key={index} position={[-0.14 + index * 0.04, -0.028, -0.03]} rotation={[-0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.009, 0.012, 0.085]} />
            <meshStandardMaterial
              color={intakeBlue}
              emissive={selected ? "#123f3d" : "#000000"}
              emissiveIntensity={selected ? 0.42 : 0}
              roughness={0.58}
            />
          </mesh>
        ))}
      </group>

      {transferShafts.map((roller, index) => (
        <group
          key={roller.z}
          ref={(node) => {
            shafts.current[index + 1] = node;
          }}
          position={[0, roller.y, roller.z]}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[roller.radius, roller.radius, 0.31, 18]} />
            <meshStandardMaterial
              color="#30393d"
              emissive={selected ? "#123f3d" : "#000000"}
              emissiveIntensity={selected ? 0.42 : 0}
              roughness={0.7}
            />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.075, -0.17]} rotation={[-0.12, 0, 0]} receiveShadow>
        <boxGeometry args={[0.285, 0.012, 0.25]} />
        <meshStandardMaterial color="#11181b" metalness={0.2} roughness={0.72} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.177, 0.19, -0.16]} rotation={[-0.72, 0, 0]} castShadow>
            <boxGeometry args={[0.018, 0.022, 0.275]} />
            <meshStandardMaterial color={aluminum} metalness={0.72} roughness={0.32} />
          </mesh>
          <mesh position={[side * 0.17, 0.13, -0.245]} rotation={[0, side * 0.16, side * 0.12]} castShadow>
            <boxGeometry args={[0.05, 0.14, 0.012]} />
            <meshStandardMaterial color="#242b2e" metalness={0.28} roughness={0.62} />
          </mesh>
        </group>
      ))}

      <MotorCan position={[0.2, 0.215, -0.16]} selected={selected} />
    </group>
  );
}

function Flywheel({
  position,
  power,
  selected,
  onSelect,
}: {
  position: [number, number, number];
  power: number;
  selected: boolean;
  onSelect?: (id: MotorId) => void;
}) {
  const wheel = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // The artifact contacts the rear (+Z) face of the flywheel. Negative X
    // rotation carries that contact surface upward into the hood.
    if (wheel.current) wheel.current.rotation.x -= power * delta * 24;
  });

  return (
    <group onPointerDown={(event) => selectMotor(event, "flywheelLeft", onSelect)}>
      <group ref={wheel} position={position}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.057, 0.057, 0.065, 28]} />
          <meshStandardMaterial
            color="#171b1d"
            emissive={selected ? "#44236c" : "#000000"}
            emissiveIntensity={selected ? 0.7 : 0}
            roughness={0.58}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.021, 0.021, 0.057, 18]} />
          <meshStandardMaterial color={darkAluminum} metalness={0.75} roughness={0.3} />
        </mesh>
        {[-1, 1].map((face) => (
          <group key={face} position={[face * 0.034, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.058, 0.058, 0.004, 28]} />
              <meshStandardMaterial color={shooterBlue} metalness={0.3} roughness={0.45} />
            </mesh>
            <mesh position={[face * 0.0025, 0, 0]} castShadow>
              <boxGeometry args={[0.003, 0.012, 0.088]} />
              <meshStandardMaterial color="#8d969a" metalness={0.52} roughness={0.38} />
            </mesh>
          </group>
        ))}
      </group>
      <MotorCan position={[position[0] + 0.074, position[1], position[2]]} selected={selected} />
    </group>
  );
}

function CurvedShooterHood() {
  const geometry = useMemo(() => {
    const profile = new THREE.Shape();
    profile.moveTo(0, 0);
    profile.quadraticCurveTo(0.004, 0.095, 0.057, 0.15);
    profile.quadraticCurveTo(0.088, 0.175, 0.132, 0.165);
    profile.lineTo(0.126, 0.142);
    profile.quadraticCurveTo(0.09, 0.15, 0.071, 0.13);
    profile.quadraticCurveTo(0.025, 0.08, 0.022, 0.004);
    profile.closePath();

    const hoodGeometry = new THREE.ExtrudeGeometry(profile, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.0025,
      bevelThickness: 0.0025,
      curveSegments: 18,
    });
    hoodGeometry.rotateY(Math.PI / 2);
    hoodGeometry.translate(-0.075, 0, 0);
    return hoodGeometry;
  }, []);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color="#15191b" metalness={0.18} roughness={0.64} />
    </mesh>
  );
}

function HoodSideRail({ side }: { side: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.087, 0.01, 0),
    new THREE.Vector3(side * 0.087, 0.085, -0.012),
    new THREE.Vector3(side * 0.087, 0.145, -0.057),
    new THREE.Vector3(side * 0.087, 0.168, -0.13),
  ]), [side]);

  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 18, 0.0075, 7, false]} />
      <meshStandardMaterial color={shooterBlue} metalness={0.28} roughness={0.46} />
    </mesh>
  );
}

function HoodRackTeeth({ side }: { side: number }) {
  return Array.from({ length: 10 }, (_, index) => {
    const progress = index / 9;
    const y = 0.015 + progress * 0.14;
    const z = -(0.004 + progress * progress * 0.066);
    return (
      <mesh key={index} position={[side * 0.081, y, z]} rotation={[-progress * 0.42, 0, 0]} castShadow>
        <boxGeometry args={[0.013, 0.007, 0.018]} />
        <meshStandardMaterial color="#0c0f10" metalness={0.18} roughness={0.68} />
      </mesh>
    );
  });
}

function ShooterSideFrame({ side }: { side: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.114, 0.012, 0.1),
    new THREE.Vector3(side * 0.118, 0.095, 0.09),
    new THREE.Vector3(side * 0.112, 0.14, 0.045),
    new THREE.Vector3(side * 0.102, 0.165, -0.015),
  ]), [side]);

  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 16, 0.008, 7, false]} />
      <meshStandardMaterial color={aluminum} metalness={0.72} roughness={0.31} />
    </mesh>
  );
}

function HoodSupportLink({ side, hood }: { side: number; hood: RefObject<THREE.Group | null> }) {
  const link = useRef<THREE.Group>(null);
  const start = useMemo(() => new THREE.Vector3(side * 0.105, 0.03, -0.075), [side]);
  const localAttachment = useMemo(() => new THREE.Vector3(side * 0.087, 0.168, -0.13), [side]);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const end = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!link.current || !hood.current) return;
    end.copy(localAttachment).applyAxisAngle(xAxis, hood.current.rotation.x).add(hood.current.position);
    direction.copy(end).sub(start);
    const length = direction.length();
    link.current.position.copy(start).add(end).multiplyScalar(0.5);
    link.current.quaternion.setFromUnitVectors(up, direction.normalize());
    link.current.scale.set(1, length, 1);
  });

  return (
    <group ref={link}>
      <mesh castShadow>
        <cylinderGeometry args={[0.007, 0.007, 1, 8]} />
        <meshStandardMaterial color={aluminum} metalness={0.72} roughness={0.31} />
      </mesh>
    </group>
  );
}

function ShooterTurret({
  powers,
  feederPosition,
  hoodPosition,
  selectedMotor,
  onSelect,
}: {
  powers: RobotMotorPowers;
  feederPosition: number;
  hoodPosition: number;
  selectedMotor: MotorId | null;
  onSelect?: (id: MotorId) => void;
}) {
  const turret = useRef<THREE.Group>(null);
  const feeder = useRef<THREE.Group>(null);
  const hood = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (turret.current) turret.current.rotation.y += powers.turret * delta * 1.25;
    if (feeder.current) feeder.current.rotation.x += feederPosition * delta * 13;
    if (hood.current) {
      const travel = THREE.MathUtils.clamp(hoodPosition, 0, 1);
      const damping = 1 - Math.exp(-delta * 7);
      const targetRotation = THREE.MathUtils.lerp(0.38, -0.16, travel);
      const arcCenterY = 0.105;
      const arcCenterZ = 0.02;
      const rackOffsetY = -0.05;
      const rackOffsetZ = 0.1;
      const targetY = arcCenterY + rackOffsetY * Math.cos(targetRotation) - rackOffsetZ * Math.sin(targetRotation);
      const targetZ = arcCenterZ + rackOffsetY * Math.sin(targetRotation) + rackOffsetZ * Math.cos(targetRotation);
      hood.current.position.y = THREE.MathUtils.lerp(hood.current.position.y, targetY, damping);
      hood.current.position.z = THREE.MathUtils.lerp(hood.current.position.z, targetZ, damping);
      hood.current.rotation.x = THREE.MathUtils.lerp(hood.current.rotation.x, targetRotation, damping);
    }
  });

  const mirroredRightFlywheelPower = -powers.flywheelRight;
  const flywheelPower = Math.abs(powers.flywheelLeft) >= Math.abs(mirroredRightFlywheelPower)
    ? powers.flywheelLeft
    : mirroredRightFlywheelPower;
  const flywheelSelected = selectedMotor === "flywheelLeft" || selectedMotor === "flywheelRight";

  return (
    <group
      position={[0, 0.315, 0.045]}
      onPointerDown={(event) => selectMotor(event, "turret", onSelect)}
    >
      <mesh castShadow>
        <cylinderGeometry args={[0.151, 0.151, 0.028, 40]} />
        <meshStandardMaterial color="#899296" metalness={0.72} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.018, 0]} castShadow>
        <cylinderGeometry args={[0.128, 0.128, 0.025, 36]} />
        <meshStandardMaterial color="#22292c" metalness={0.5} roughness={0.42} />
      </mesh>

      <group ref={turret} position={[0, 0.025, 0]}>
        <Flywheel
          position={[0, 0.112, -0.073]}
          power={flywheelPower}
          selected={flywheelSelected}
          onSelect={onSelect}
        />

        {[-1, 1].map((side) => (
          <group key={side}>
            <ShooterSideFrame side={side} />
            <HoodSupportLink side={side} hood={hood} />
          </group>
        ))}

        <group ref={hood} position={[0, 0.05, 0.103]}>
          <CurvedShooterHood />
          {[-1, 1].map((side) => (
            <group key={side}>
              <HoodSideRail side={side} />
              <HoodRackTeeth side={side} />
            </group>
          ))}
        </group>

        <group ref={feeder} position={[0, 0.105, 0.095]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.028, 0.028, 0.145, 20]} />
            <meshStandardMaterial color={feederRed} roughness={0.58} />
          </mesh>
        </group>

        <group position={[0.132, 0.13, 0.085]}>
          <mesh castShadow>
            <boxGeometry args={[0.035, 0.052, 0.048]} />
            <meshStandardMaterial color="#8f989c" metalness={0.35} roughness={0.45} />
          </mesh>
          <mesh position={[-0.024, 0.025, -0.005]} rotation={[0.35, 0, -0.48]} castShadow>
            <boxGeometry args={[0.008, 0.075, 0.01]} />
            <meshStandardMaterial color={shooterBlue} metalness={0.3} roughness={0.48} />
          </mesh>
        </group>
      </group>

    </group>
  );
}

export function DecodeRobotModel({
  powers,
  feederPosition,
  hoodPosition,
  selectedMotor = null,
  onSelect,
  allianceColor = "blue",
}: DecodeRobotModelProps) {
  return (
    <group>
      <TrussChassis allianceColor={allianceColor} />

      <MecanumWheel id="frontLeftDrive" position={[-0.197, 0.048, -0.145]} power={powers.frontLeftDrive} selected={selectedMotor === "frontLeftDrive"} onSelect={onSelect} />
      <MecanumWheel id="frontRightDrive" position={[0.197, 0.048, -0.145]} power={powers.frontRightDrive} selected={selectedMotor === "frontRightDrive"} onSelect={onSelect} />
      <MecanumWheel id="rearLeftDrive" position={[-0.197, 0.048, 0.145]} power={powers.rearLeftDrive} selected={selectedMotor === "rearLeftDrive"} onSelect={onSelect} />
      <MecanumWheel id="rearRightDrive" position={[0.197, 0.048, 0.145]} power={powers.rearRightDrive} selected={selectedMotor === "rearRightDrive"} onSelect={onSelect} />

      <IntakeAssembly power={powers.intake} selected={selectedMotor === "intake"} onSelect={onSelect} />
      <ShooterTurret
        powers={powers}
        feederPosition={feederPosition}
        hoodPosition={hoodPosition}
        selectedMotor={selectedMotor}
        onSelect={onSelect}
      />
    </group>
  );
}
