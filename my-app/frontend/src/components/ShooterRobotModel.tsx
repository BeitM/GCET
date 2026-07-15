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
  const actualFlywheelPower = Math.max(-1, Math.min(1, frame.shooterRpm / 6000));
  const powers = running
    ? {
        ...frame.motorPowers,
        flywheelLeft: actualFlywheelPower,
        flywheelRight: -actualFlywheelPower,
      }
    : stoppedMotorPowers;

  return (
    <group position={[0, -0.12 * scale, 0]} scale={scale}>
      <DecodeRobotModel
        powers={powers}
        feederPosition={running && frame.feeder ? 1 : 0}
        hoodPosition={(frame.hoodAngle - 20) / 50}
        allianceColor={allianceColor}
      />
    </group>
  );
}
