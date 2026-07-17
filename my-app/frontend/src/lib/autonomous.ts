import type { MotorId, RobotMotorPowers } from "@/lib/motors";

export type RobotCommand =
  | { type: "drive"; direction: "forward" | "backward" | "left" | "right"; distance: number }
  | { type: "driveTo"; x: number; y: number; heading?: number }
  | { type: "turn"; heading: number }
  | { type: "spinFlywheel"; rpm: number }
  | { type: "shoot"; angle: number }
  | { type: "intake"; mode: "in" | "out" | "off" }
  | { type: "setMotor"; motor: MotorId; power: number }
  | { type: "setDriveMotors"; powers: Pick<RobotMotorPowers, "frontLeftDrive" | "frontRightDrive" | "rearLeftDrive" | "rearRightDrive"> }
  | { type: "stopMotors"; scope: "drive" | "all" }
  | { type: "start" }
  | { type: "wait"; seconds: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampMotorPower(power: number) {
  return clamp(Number.isFinite(power) ? power : 0, -1, 1);
}

function normalizeHeading(value: number) {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function parseArgs(raw: string) {
  if (!raw.trim()) return [];
  return raw.split(",").map((arg) => Number(arg.trim())).filter((value) => Number.isFinite(value));
}

const motorChannelAliases: Record<string, MotorId> = {
  frontleftdrive: "frontLeftDrive",
  frontleftmotor: "frontLeftDrive",
  frontrightdrive: "frontRightDrive",
  frontrightmotor: "frontRightDrive",
  rearleftdrive: "rearLeftDrive",
  rearleftmotor: "rearLeftDrive",
  rearrightdrive: "rearRightDrive",
  rearrightmotor: "rearRightDrive",
  intakemotor: "intake",
  intake: "intake",
  leftflywheel: "flywheelLeft",
  flywheelleft: "flywheelLeft",
  rightflywheel: "flywheelRight",
  flywheelright: "flywheelRight",
  turretmotor: "turret",
  turret: "turret",
};

const motorPowerFunctionAliases: Record<string, MotorId> = {
  setfrontleftpower: "frontLeftDrive",
  setfrontrightpower: "frontRightDrive",
  setrearleftpower: "rearLeftDrive",
  setrearrightpower: "rearRightDrive",
  setintakepower: "intake",
  setleftflywheelpower: "flywheelLeft",
  setrightflywheelpower: "flywheelRight",
  setturretpower: "turret",
};

export function parseRobotCode(source: string): RobotCommand[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/[;\n]/)
    .map((line) => line.replace(/\/\/.*$/g, "").trim())
    .filter(Boolean)
    .map((line) => {
      const memberCall = line.match(/^([a-zA-Z_][\w]*)\s*\.\s*setPower\s*\((.*)\)$/i);
      if (memberCall) {
        const motor = motorChannelAliases[memberCall[1].toLowerCase()];
        const power = parseArgs(memberCall[2])[0];
        if (motor && Number.isFinite(power)) {
          return { type: "setMotor", motor, power: clampMotorPower(power) } satisfies RobotCommand;
        }
        return null;
      }

      const match = line.match(/^([a-zA-Z_][\w]*)\s*\((.*)\)$/);
      if (!match) return null;

      const name = match[1].toLowerCase();
      const args = parseArgs(match[2]);
      const first = args[0];
      const distance = Number.isFinite(first) ? first : 16;

      if (name === "driveforward" || name === "move_forward" || name === "moveup" || name === "move_up") return { type: "drive", direction: "forward", distance } satisfies RobotCommand;
      if (name === "driveback" || name === "drivebackward" || name === "move_backward" || name === "movedown" || name === "move_down") return { type: "drive", direction: "backward", distance } satisfies RobotCommand;
      if (name === "driveleft" || name === "strafeleft" || name === "move_left") return { type: "drive", direction: "left", distance } satisfies RobotCommand;
      if (name === "driveright" || name === "straferight" || name === "move_right") return { type: "drive", direction: "right", distance } satisfies RobotCommand;
      if (name === "drivetoposition" && args.length >= 2) return { type: "driveTo", x: args[0], y: args[1], heading: args.length >= 3 ? args[2] : undefined } satisfies RobotCommand;
      if (name === "turn") return { type: "turn", heading: normalizeHeading(first || 0) } satisfies RobotCommand;
      if (name === "spinflywheel") return { type: "spinFlywheel", rpm: clamp(first || 0, 0, 6000) } satisfies RobotCommand;
      if (name === "shoot") return { type: "shoot", angle: clamp(Number.isFinite(first) ? first : 45, 20, 70) } satisfies RobotCommand;
      if (name === "intakespinin") return { type: "intake", mode: "in" } satisfies RobotCommand;
      if (name === "intakespinout") return { type: "intake", mode: "out" } satisfies RobotCommand;
      if (name === "intakestopspin" || name === "intakestopspini") return { type: "intake", mode: "off" } satisfies RobotCommand;
      if (motorPowerFunctionAliases[name] && Number.isFinite(first)) {
        return { type: "setMotor", motor: motorPowerFunctionAliases[name], power: clampMotorPower(first) } satisfies RobotCommand;
      }
      if (name === "setdrivemotorpowers" && args.length >= 4) {
        return {
          type: "setDriveMotors",
          powers: {
            frontLeftDrive: clampMotorPower(args[0]),
            frontRightDrive: clampMotorPower(args[1]),
            rearLeftDrive: clampMotorPower(args[2]),
            rearRightDrive: clampMotorPower(args[3]),
          },
        } satisfies RobotCommand;
      }
      if (name === "stopdrivemotors") return { type: "stopMotors", scope: "drive" } satisfies RobotCommand;
      if (name === "stopallmotors") return { type: "stopMotors", scope: "all" } satisfies RobotCommand;
      if (name === "waitforstart") return { type: "start" } satisfies RobotCommand;
      if (name === "sleep") return { type: "wait", seconds: Math.max(0, first || 0) / 1_000 } satisfies RobotCommand;
      if (name === "wait") return { type: "wait", seconds: Math.max(0, first || 0) } satisfies RobotCommand;
      return null;
    })
    .filter(Boolean) as RobotCommand[];
}
