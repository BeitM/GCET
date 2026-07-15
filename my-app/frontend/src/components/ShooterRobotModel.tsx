"use client";

import { DecodeRobotModel } from "@/components/DecodeRobotModel";
import { stoppedMotorPowers } from "@/lib/motors";
import type { AllianceColor, TelemetryFrame } from "@/lib/types";

type ShooterRobotModelProps = {
  frame: TelemetryFrame;
  width: number;
  length: number;
  running: boolean;
  allianceColor: AllianceColor;
};

const MODEL_FOOTPRINT_METERS = 0.4572;

export function ShooterRobotModel({ frame, width, length, running, allianceColor }: ShooterRobotModelProps) {
  const scale = Math.min(width, length) / MODEL_FOOTPRINT_METERS;
  const powers = running ? frame.motorPowers : stoppedMotorPowers;

  return (
    <group position={[0, -0.12 * scale, 0]} scale={scale}>
      <DecodeRobotModel
        powers={powers}
        feederPosition={running && frame.feeder ? 1 : 0}
        hoodPosition={0.46}
        allianceColor={allianceColor}
      />
    </group>
  );
}
