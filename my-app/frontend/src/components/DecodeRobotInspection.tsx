"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import styles from "@/app/robot-preview/robot-preview.module.css";
import { DecodeRobotModel } from "@/components/DecodeRobotModel";
import type { MotorId, RobotMotorPowers } from "@/lib/motors";
import { stoppedMotorPowers } from "@/lib/motors";

type MotorDefinition = {
  id: MotorId;
  label: string;
  cadLabel: string;
  group: "Drivetrain" | "Intake" | "Shooter";
};

const motorDefinitions: MotorDefinition[] = [
  { id: "frontLeftDrive", label: "Front-left drive", cadLabel: "Mecanum drive motor", group: "Drivetrain" },
  { id: "frontRightDrive", label: "Front-right drive", cadLabel: "Mecanum drive motor", group: "Drivetrain" },
  { id: "rearLeftDrive", label: "Rear-left drive", cadLabel: "Mecanum drive motor", group: "Drivetrain" },
  { id: "rearRightDrive", label: "Rear-right drive", cadLabel: "Mecanum drive motor", group: "Drivetrain" },
  { id: "intake", label: "Intake motor", cadLabel: "Front roller intake", group: "Intake" },
  { id: "flywheelLeft", label: "Left flywheel", cadLabel: "Turret flywheel motor", group: "Shooter" },
  { id: "flywheelRight", label: "Right flywheel", cadLabel: "Turret flywheel motor", group: "Shooter" },
  { id: "turret", label: "Turret gearbox", cadLabel: "Rotating shooter base", group: "Shooter" },
];

const demoMotors: RobotMotorPowers = {
  frontLeftDrive: 0.62,
  frontRightDrive: 0.62,
  rearLeftDrive: 0.62,
  rearRightDrive: 0.62,
  intake: 0.78,
  flywheelLeft: 0.9,
  flywheelRight: -0.9,
  turret: 0.12,
};

function InspectionScene(props: {
  powers: RobotMotorPowers;
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

      <group rotation={[0, -0.28, 0]}>
        <DecodeRobotModel {...props} allianceColor="blue" />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.2, 3.2]} />
        <meshStandardMaterial color="#0a1217" roughness={0.96} />
      </mesh>
      <gridHelper args={[3.2, 32, "#24515b", "#10262d"]} position={[0, 0.002, 0]} />
      <ContactShadows position={[0, 0.004, 0]} scale={1.8} opacity={0.65} blur={2.2} far={1.3} />
      <OrbitControls makeDefault target={[0, 0.3, 0]} minDistance={0.75} maxDistance={2.4} minPolarAngle={0.28} maxPolarAngle={Math.PI / 2.04} enableDamping />
    </>
  );
}

export function DecodeRobotInspection() {
  const [powers, setPowers] = useState<RobotMotorPowers>(stoppedMotorPowers);
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
            <h2>Reckless-inspired silhouette · simulation-ready mechanisms</h2>
          </div>
          <span>Click a mechanism or use its channel control</span>
        </div>
        <div className={styles.canvasWrap}>
          <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.75]} camera={{ position: [1.15, 0.85, -1.3], fov: 38, near: 0.05, far: 10 }}>
            <InspectionScene
              powers={powers}
              selectedMotor={selectedMotor}
              feederPosition={feederPosition}
              hoodPosition={hoodPosition}
              onSelect={setSelectedMotor}
            />
          </Canvas>
          <div className={styles.canvasBadge}><i />CAD source · Team 25444 snapshot</div>
          <div className={styles.frontMarker}>▲ FRONT / INTAKE</div>
          <div className={styles.cameraHint}>Drag to orbit · Scroll to zoom</div>
        </div>
      </div>

      <aside className={styles.controls}>
        <div className={styles.controlIntro}>
          <p className={styles.sectionKicker}>Motor bench</p>
          <h2>8 independent powered channels</h2>
          <p>These controls use the same eight motor channel names available to scripts in the field simulator.</p>
          <div className={styles.actionRow}>
            <button type="button" onClick={() => setPowers(demoMotors)}>Run mechanism demo</button>
            <button type="button" onClick={() => setPowers(stoppedMotorPowers)}>All stop</button>
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
              <span>Shooter hood servo</span>
              <input type="range" min="0" max="100" value={Math.round(hoodPosition * 100)} onChange={(event) => setHoodPosition(Number(event.target.value) / 100)} />
              <output>{Math.round(hoodPosition * 100)}</output>
            </label>
          </div>
        </div>

        <div className={styles.cadTrace}>
          <p className={styles.sectionKicker}>STEP assembly trace</p>
          <h3>Preserved from the supplied model</h3>
          <ul>
            <li>Compact exposed truss chassis with four yellow mecanum assemblies.</li>
            <li>Elevated brush shaft with blue pickup fingers feeding two rising transfer rollers.</li>
            <li>Top-mounted rotating shooter with two powered flywheels.</li>
            <li>Visible five-inch artifact chamber, curved servo-adjustable hood, feeder, and turret drive.</li>
            <li>Detailed fasteners, wiring, gears, and internal hardware omitted for browser performance.</li>
          </ul>
        </div>

        <div className={styles.isolationNote}>
          <strong>Integrated model reference</strong>
          This inspection bench and the field simulator now render the same lightweight robot geometry and motor channels.
        </div>
      </aside>
    </section>
  );
}
