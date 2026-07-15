export const motorIds = [
  "frontLeftDrive",
  "frontRightDrive",
  "rearLeftDrive",
  "rearRightDrive",
  "intake",
  "flywheelLeft",
  "flywheelRight",
  "turret",
] as const;

export type MotorId = (typeof motorIds)[number];
export type RobotMotorPowers = Record<MotorId, number>;

export const stoppedMotorPowers: RobotMotorPowers = {
  frontLeftDrive: 0,
  frontRightDrive: 0,
  rearLeftDrive: 0,
  rearRightDrive: 0,
  intake: 0,
  flywheelLeft: 0,
  flywheelRight: 0,
  turret: 0,
};

export function clampMotorPower(power: number) {
  return Math.max(-1, Math.min(1, Number.isFinite(power) ? power : 0));
}

export function setMotorPower(
  powers: RobotMotorPowers,
  id: MotorId,
  power: number,
): RobotMotorPowers {
  return { ...powers, [id]: clampMotorPower(power) };
}

export function mecanumMotorPowers(
  forward: number,
  strafeRight: number,
  turnRight: number,
): RobotMotorPowers {
  const raw = {
    frontLeftDrive: forward + strafeRight - turnRight,
    frontRightDrive: forward - strafeRight + turnRight,
    rearLeftDrive: forward - strafeRight - turnRight,
    rearRightDrive: forward + strafeRight + turnRight,
  };
  const scale = Math.max(1, ...Object.values(raw).map(Math.abs));

  return {
    ...stoppedMotorPowers,
    frontLeftDrive: raw.frontLeftDrive / scale,
    frontRightDrive: raw.frontRightDrive / scale,
    rearLeftDrive: raw.rearLeftDrive / scale,
    rearRightDrive: raw.rearRightDrive / scale,
  };
}

export function driveAxesFromMotorPowers(powers: RobotMotorPowers) {
  const { frontLeftDrive: fl, frontRightDrive: fr, rearLeftDrive: rl, rearRightDrive: rr } = powers;

  return {
    forward: (fl + fr + rl + rr) / 4,
    strafeRight: (fl - fr - rl + rr) / 4,
    turnRight: (-fl + fr - rl + rr) / 4,
  };
}

export function sidePowersFromMotors(powers: RobotMotorPowers) {
  return {
    leftPower: (powers.frontLeftDrive + powers.rearLeftDrive) / 2,
    rightPower: (powers.frontRightDrive + powers.rearRightDrive) / 2,
  };
}

export function sanitizeMotorPowers(value: unknown): RobotMotorPowers {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};

  return motorIds.reduce<RobotMotorPowers>((powers, id) => {
    const valueForMotor = source[id];
    powers[id] = clampMotorPower(typeof valueForMotor === "number" ? valueForMotor : 0);
    return powers;
  }, { ...stoppedMotorPowers });
}
