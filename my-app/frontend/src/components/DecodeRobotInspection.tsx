"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import styles from "@/app/robot-preview/robot-preview.module.css";

type MotorId =
  | "frontLeftDrive"
  | "frontRightDrive"
  | "rearLeftDrive"
  | "rearRightDrive"
  | "intake"
  | "flywheelLeft"
  | "flywheelRight"
  | "turret";

type MotorPowers = Record<MotorId, number>;

type MotorDefinition = {
  id: MotorId;
  label: string;
  cadLabel: string;
  group: "Drivetrain" | "Intake" | "Shooter";
};

const motorDefinitions: MotorDefinition[] = [
  { id: "frontLeftDrive", label: "Front-left drive", cadLabel: "435 rpm motor", group: "Drivetrain" },
  { id: "frontRightDrive", label: "Front-right drive", cadLabel: "435 rpm motor", group: "Drivetrain" },
  { id: "rearLeftDrive", label: "Rear-left drive", cadLabel: "435 rpm motor", group: "Drivetrain" },
  { id: "rearRightDrive", label: "Rear-right drive", cadLabel: "435 rpm motor", group: "Drivetrain" },
  { id: "intake", label: "Intake motor", cadLabel: "435 rpm motor v3 (2)", group: "Intake" },
  { id: "flywheelLeft", label: "Left flywheel", cadLabel: "Motor rev · shooter motor", group: "Shooter" },
  { id: "flywheelRight", label: "Right flywheel", cadLabel: "Motor rev (Mirror)", group: "Shooter" },
  { id: "turret", label: "Turret gearbox", cadLabel: "90 gearbox motor", group: "Shooter" },
];

const stoppedMotors: MotorPowers = {
  frontLeftDrive: 0,
  frontRightDrive: 0,
  rearLeftDrive: 0,
  rearRightDrive: 0,
  intake: 0,
  flywheelLeft: 0,
  flywheelRight: 0,
  turret: 0,
};

const demoMotors: MotorPowers = {
  frontLeftDrive: 0.62,
  frontRightDrive: 0.62,
  rearLeftDrive: 0.62,
  rearRightDrive: 0.62,
  intake: 0.78,
  flywheelLeft: 0.9,
  flywheelRight: -0.9,
  turret: 0.12,
};

const aluminum = "#aebac0";
const motorGold = "#d7a22e";
const rotationDecal = "#f4df5d";

function stopPointer(event: ThreeEvent<PointerEvent>, action: () => void) {
  event.stopPropagation();
  action();
}

function MotorCan({
  position,
  rotation = [0, 0, Math.PI / 2],
  selected,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  selected: boolean;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[0.027, 0.027, 0.07, 22]} />
        <meshStandardMaterial
          color={motorGold}
          emissive={selected ? "#73510d" : "#000000"}
          emissiveIntensity={selected ? 0.75 : 0}
          metalness={0.62}
          roughness={0.33}
        />
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
  onSelect: (id: MotorId) => void;
}) {
  const wheel = useRef<THREE.Group>(null);
  const side = Math.sign(position[0]);

  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.x += power * delta * 11;
  });

  return (
    <group onPointerDown={(event) => stopPointer(event, () => onSelect(id))}>
      <group ref={wheel} position={position}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.052, 0.052, 0.038, 30]} />
          <meshStandardMaterial
            color="#11171a"
            emissive={selected ? "#174d4b" : "#000000"}
            emissiveIntensity={selected ? 0.55 : 0}
            roughness={0.78}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.043, 22]} />
          <meshStandardMaterial color={aluminum} metalness={0.84} roughness={0.25} />
        </mesh>
        {[-1, 1].map((face) => (
          <mesh key={face} position={[face * 0.0215, 0, 0]} castShadow>
            <boxGeometry args={[0.003, 0.011, 0.086]} />
            <meshStandardMaterial color={rotationDecal} emissive="#594d09" emissiveIntensity={0.45} roughness={0.5} />
          </mesh>
        ))}
      </group>
      <MotorCan
        position={[position[0] - side * 0.073, position[1], position[2]]}
        selected={selected}
      />
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
  onSelect: (id: MotorId) => void;
}) {
  const rollers = useRef<Array<THREE.Group | null>>([]);
  const brush = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    rollers.current.forEach((roller, index) => {
      if (roller) roller.rotation.x += power * delta * (13 + index * 1.5);
    });
    if (brush.current) brush.current.rotation.x += power * delta * 17;
  });

  const rollerSpecs = [
    { y: 0.064, z: -0.27, radius: 0.029 },
    { y: 0.116, z: -0.224, radius: 0.027 },
    { y: 0.164, z: -0.174, radius: 0.025 },
  ];

  return (
    <group onPointerDown={(event) => stopPointer(event, () => onSelect("intake"))}>
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
            <meshStandardMaterial
              color={selected ? "#315254" : "#26343a"}
              emissive={selected ? "#123f3d" : "#000000"}
              emissiveIntensity={selected ? 0.42 : 0}
              roughness={0.7}
            />
          </mesh>
          {[-1, 1].map((face) => (
            <mesh key={face} position={[face * 0.1815, 0, 0]} castShadow>
              <boxGeometry args={[0.003, 0.008, roller.radius * 1.72]} />
              <meshStandardMaterial color={rotationDecal} emissive="#594d09" emissiveIntensity={0.45} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      <group ref={brush} position={[0, 0.197, -0.129]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 0.35, 24]} />
          <meshStandardMaterial
            color={selected ? "#7859a0" : "#5c4775"}
            emissive={selected ? "#2d184b" : "#000000"}
            emissiveIntensity={selected ? 0.4 : 0}
            roughness={0.68}
          />
        </mesh>
        {[-1, 1].map((face) => (
          <mesh key={face} position={[face * 0.1765, 0, 0]} castShadow>
            <boxGeometry args={[0.003, 0.009, 0.065]} />
            <meshStandardMaterial color={rotationDecal} emissive="#594d09" emissiveIntensity={0.45} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.19, 0.123, -0.205]} rotation={[-0.78, 0, 0]} castShadow>
          <boxGeometry args={[0.019, 0.035, 0.25]} />
          <meshStandardMaterial color="#829097" metalness={0.68} roughness={0.33} />
        </mesh>
      ))}
      <MotorCan position={[0.204, 0.151, -0.171]} selected={selected} />
    </group>
  );
}

function ShooterTurret({
  powers,
  selectedMotor,
  feederPosition,
  hoodPosition,
  onSelect,
}: {
  powers: MotorPowers;
  selectedMotor: MotorId | null;
  feederPosition: number;
  hoodPosition: number;
  onSelect: (id: MotorId) => void;
}) {
  const turret = useRef<THREE.Group>(null);
  const leftFlywheel = useRef<THREE.Group>(null);
  const rightFlywheel = useRef<THREE.Group>(null);
  const feeder = useRef<THREE.Group>(null);
  const hood = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (turret.current) turret.current.rotation.y += powers.turret * delta * 1.25;
    if (leftFlywheel.current) leftFlywheel.current.rotation.x += powers.flywheelLeft * delta * 23;
    if (rightFlywheel.current) rightFlywheel.current.rotation.x += powers.flywheelRight * delta * 23;
    if (feeder.current) feeder.current.rotation.x = THREE.MathUtils.lerp(feeder.current.rotation.x, feederPosition * Math.PI * 0.72, 1 - Math.exp(-delta * 8));
    if (hood.current) hood.current.rotation.x = THREE.MathUtils.lerp(hood.current.rotation.x, -0.12 - hoodPosition * 0.42, 1 - Math.exp(-delta * 7));
  });

  const flywheel = (
    id: "flywheelLeft" | "flywheelRight",
    x: number,
    ref: React.RefObject<THREE.Group | null>,
  ) => (
    <group
      ref={ref}
      position={[x, 0.188, -0.026]}
      onPointerDown={(event) => stopPointer(event, () => onSelect(id))}
    >
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.062, 0.062, 0.036, 36]} />
        <meshStandardMaterial
          color="#20282c"
          emissive={selectedMotor === id ? "#3d2464" : "#000000"}
          emissiveIntensity={selectedMotor === id ? 0.72 : 0}
          roughness={0.55}
        />
      </mesh>
      {[-1, 1].map((face) => (
        <mesh key={face} position={[face * 0.019, 0, 0]} castShadow>
          <boxGeometry args={[0.003, 0.011, 0.103]} />
          <meshStandardMaterial color={rotationDecal} emissive="#594d09" emissiveIntensity={0.48} roughness={0.48} />
        </mesh>
      ))}
    </group>
  );

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

        {flywheel("flywheelLeft", -0.072, leftFlywheel)}
        {flywheel("flywheelRight", 0.072, rightFlywheel)}

        <group onPointerDown={(event) => stopPointer(event, () => onSelect("flywheelLeft"))}>
          <MotorCan position={[-0.142, 0.188, 0.032]} selected={selectedMotor === "flywheelLeft"} />
        </group>
        <group onPointerDown={(event) => stopPointer(event, () => onSelect("flywheelRight"))}>
          <MotorCan position={[0.142, 0.188, 0.032]} selected={selectedMotor === "flywheelRight"} />
        </group>

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

      <group onPointerDown={(event) => stopPointer(event, () => onSelect("turret"))}>
        <MotorCan position={[0.156, 0.055, 0.026]} selected={selectedMotor === "turret"} />
        <mesh position={[0.116, 0.055, 0.026]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.034, 0.034, 0.035, 26]} />
          <meshStandardMaterial color="#65737a" metalness={0.78} roughness={0.28} />
        </mesh>
      </group>
    </group>
  );
}

function SimplifiedShell() {
  const panelMaterial = (
    <meshPhysicalMaterial
      color="#7babb7"
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

function RobotInspectionModel({
  powers,
  selectedMotor,
  feederPosition,
  hoodPosition,
  onSelect,
}: {
  powers: MotorPowers;
  selectedMotor: MotorId | null;
  feederPosition: number;
  hoodPosition: number;
  onSelect: (id: MotorId) => void;
}) {
  return (
    <group rotation={[0, -0.28, 0]}>
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

      <MecanumWheel id="frontLeftDrive" position={[-0.218, 0.075, -0.146]} power={powers.frontLeftDrive} selected={selectedMotor === "frontLeftDrive"} onSelect={onSelect} />
      <MecanumWheel id="frontRightDrive" position={[0.218, 0.075, -0.146]} power={powers.frontRightDrive} selected={selectedMotor === "frontRightDrive"} onSelect={onSelect} />
      <MecanumWheel id="rearLeftDrive" position={[-0.218, 0.075, 0.146]} power={powers.rearLeftDrive} selected={selectedMotor === "rearLeftDrive"} onSelect={onSelect} />
      <MecanumWheel id="rearRightDrive" position={[0.218, 0.075, 0.146]} power={powers.rearRightDrive} selected={selectedMotor === "rearRightDrive"} onSelect={onSelect} />

      <IntakeAssembly power={powers.intake} selected={selectedMotor === "intake"} onSelect={onSelect} />
      <ShooterTurret powers={powers} selectedMotor={selectedMotor} feederPosition={feederPosition} hoodPosition={hoodPosition} onSelect={onSelect} />
      <SimplifiedShell />
    </group>
  );
}

function InspectionScene(props: {
  powers: MotorPowers;
  selectedMotor: MotorId | null;
  feederPosition: number;
  hoodPosition: number;
  onSelect: (id: MotorId) => void;
}) {
  return (
    <>
      <color attach="background" args={["#071016"]} />
      <fog attach="fog" args={["#071016", 1.7, 3.4]} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#e2f3ff", "#172026", 1.65]} />
      <directionalLight position={[2.2, 3.8, 2.6]} intensity={3.1} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-2.5, 1.8, -1.8]} intensity={1.4} color="#86b8ff" />
      <directionalLight position={[1.8, 1.2, -2.6]} intensity={1.1} color="#47e8df" />

      <RobotInspectionModel {...props} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.2, 3.2]} />
        <meshStandardMaterial color="#0a1217" roughness={0.96} />
      </mesh>
      <gridHelper args={[3.2, 32, "#24515b", "#10262d"]} position={[0, 0.002, 0]} />
      <ContactShadows position={[0, 0.004, 0]} scale={1.8} opacity={0.65} blur={2.2} far={1.3} />
      <OrbitControls makeDefault target={[0, 0.24, 0]} minDistance={0.75} maxDistance={2.4} minPolarAngle={0.28} maxPolarAngle={Math.PI / 2.04} enableDamping />
    </>
  );
}

export function DecodeRobotInspection() {
  const [powers, setPowers] = useState<MotorPowers>(stoppedMotors);
  const [selectedMotor, setSelectedMotor] = useState<MotorId | null>("frontLeftDrive");
  const [feederPosition, setFeederPosition] = useState(0.18);
  const [hoodPosition, setHoodPosition] = useState(0.46);

  const setMotorPower = (id: MotorId, value: number) => {
    setSelectedMotor(id);
    setPowers((current) => ({ ...current, [id]: value }));
  };

  return (
    <section className={styles.workspace}>
      <div className={styles.viewer}>
        <div className={styles.viewerHead}>
          <div>
            <p>Interactive assembly view</p>
            <h2>Simplified outer shell · powered mechanisms preserved</h2>
          </div>
          <span>Click a mechanism or use its channel control</span>
        </div>
        <div className={styles.canvasWrap}>
          <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.75]} camera={{ position: [0.94, 0.76, 1.06], fov: 38, near: 0.05, far: 10 }}>
            <InspectionScene
              powers={powers}
              selectedMotor={selectedMotor}
              feederPosition={feederPosition}
              hoodPosition={hoodPosition}
              onSelect={setSelectedMotor}
            />
          </Canvas>
          <div className={styles.canvasBadge}><i />CAD source · new bot decode v17</div>
          <div className={styles.frontMarker}>▲ FRONT / INTAKE</div>
          <div className={styles.cameraHint}>Drag to orbit · Scroll to zoom</div>
        </div>
      </div>

      <aside className={styles.controls}>
        <div className={styles.controlIntro}>
          <p className={styles.sectionKicker}>Motor bench</p>
          <h2>8 independent powered channels</h2>
          <p>These controls use the same eight motor channel names now available to scripts in the integrated field simulator.</p>
          <div className={styles.actionRow}>
            <button type="button" onClick={() => setPowers(demoMotors)}>Run mechanism demo</button>
            <button type="button" onClick={() => setPowers(stoppedMotors)}>All stop</button>
          </div>
        </div>

        <div className={styles.controlSection}>
          <p className={styles.sectionKicker}>Power · -100 to +100</p>
          <h3>DC motor channels</h3>
          {(["Drivetrain", "Intake", "Shooter"] as const).map((group) => (
            <div className={styles.motorGroup} key={group}>
              <div className={styles.motorGroupTitle}>{group}</div>
              {motorDefinitions.filter((motor) => motor.group === group).map((motor) => (
                <div className={`${styles.motorControl} ${selectedMotor === motor.id ? styles.selected : ""}`} key={motor.id}>
                  <button className={styles.motorLabel} type="button" onClick={() => setSelectedMotor(motor.id)}>
                    <strong>{motor.label}</strong>
                    <small>{motor.cadLabel}</small>
                  </button>
                  <input
                    aria-label={`${motor.label} power`}
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={Math.round(powers[motor.id] * 100)}
                    onChange={(event) => setMotorPower(motor.id, Number(event.target.value) / 100)}
                  />
                  <output className={styles.motorValue}>{Math.round(powers[motor.id] * 100)}</output>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.controlSection}>
          <p className={styles.sectionKicker}>Position · 0 to 100</p>
          <h3>Servo articulation</h3>
          <div className={styles.servoGrid}>
            <label className={styles.servoControl}>
              <span>Feeder servo</span>
              <input type="range" min="0" max="100" value={Math.round(feederPosition * 100)} onChange={(event) => setFeederPosition(Number(event.target.value) / 100)} />
              <output>{Math.round(feederPosition * 100)}</output>
            </label>
            <label className={styles.servoControl}>
              <span>Hood servo</span>
              <input type="range" min="0" max="100" value={Math.round(hoodPosition * 100)} onChange={(event) => setHoodPosition(Number(event.target.value) / 100)} />
              <output>{Math.round(hoodPosition * 100)}</output>
            </label>
          </div>
        </div>

        <div className={styles.cadTrace}>
          <p className={styles.sectionKicker}>STEP assembly trace</p>
          <h3>Preserved from the attached model</h3>
          <ul>
            <li>Four mecanum assemblies and four nested 435-RPM drive motors.</li>
            <li>Three intake shaft assemblies, rubber rollers, and the brush intake.</li>
            <li>Dual flywheels with two mirrored REV motor assemblies.</li>
            <li>90-degree gearbox turret drive plus feeder and hood servos.</li>
            <li>Reinforced inner, outer, mirrored, and rooftop panels simplified into a translucent shell.</li>
          </ul>
        </div>

        <div className={styles.isolationNote}>
          <strong>Integrated model reference</strong>
          This standalone bench remains available for close inspection while the same geometry and motor channels run in the field simulator.
        </div>
      </aside>
    </section>
  );
}
