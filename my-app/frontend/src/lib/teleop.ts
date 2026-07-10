export type TeleopDirection = "forward" | "backward" | "left" | "right";
export type TeleopTurnDirection = "left" | "right";
export type TeleopAction =
  | { type: "drive"; direction: TeleopDirection; amount: number }
  | { type: "turn"; direction: TeleopTurnDirection; amount: number }
  | { type: "spinFlywheel"; rpm: number }
  | { type: "shoot"; angle: number }
  | { type: "intake"; mode: "in" | "out" | "off" };

export type TeleopBinding = {
  id: string;
  gamepad: 1 | 2;
  control: string;
  operator?: ">" | ">=" | "<" | "<=" | "===" | "==";
  threshold?: number;
  action: TeleopAction;
};

export type GamepadSnapshot = {
  index: number;
  id: string;
  buttons: boolean[];
  buttonValues: number[];
  axes: number[];
};

export const VIRTUAL_GAMEPAD_INDEX = -1;

const BUTTON_INDEX: Record<string, number> = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  left_bumper: 4,
  lb: 4,
  right_bumper: 5,
  rb: 5,
  left_trigger: 6,
  right_trigger: 7,
  back: 8,
  start: 9,
  left_stick_button: 10,
  right_stick_button: 11,
  dpad_up: 12,
  dpad_down: 13,
  dpad_left: 14,
  dpad_right: 15,
};

const AXIS_INDEX: Record<string, number> = {
  left_stick_x: 0,
  left_stick_y: 1,
  right_stick_x: 2,
  right_stick_y: 3,
};

export const createVirtualGamepadSnapshot = (): GamepadSnapshot => ({
  index: VIRTUAL_GAMEPAD_INDEX,
  id: "Virtual Mouse Gamepad",
  buttons: Array.from({ length: 16 }, () => false),
  buttonValues: Array.from({ length: 16 }, () => 0),
  axes: [0, 0, 0, 0],
});

export function setVirtualGamepadButton(snapshot: GamepadSnapshot, control: string, value: number) {
  const buttonIndex = BUTTON_INDEX[control.toLowerCase()];
  if (buttonIndex === undefined) return snapshot;
  const nextValue = Math.min(1, Math.max(0, value));
  const buttons = snapshot.buttons.slice();
  const buttonValues = snapshot.buttonValues.slice();
  buttons[buttonIndex] = nextValue > 0.5;
  buttonValues[buttonIndex] = nextValue;
  return { ...snapshot, buttons, buttonValues };
}

export function setVirtualGamepadAxis(snapshot: GamepadSnapshot, control: string, value: number) {
  const axisIndex = AXIS_INDEX[control.toLowerCase()];
  if (axisIndex === undefined) return snapshot;
  const nextValue = Math.min(1, Math.max(-1, value));
  const axes = snapshot.axes.slice();
  axes[axisIndex] = control.toLowerCase().endsWith("_y") ? -nextValue : nextValue;
  return { ...snapshot, axes };
}

const parseNumber = (raw: string, fallback: number) => {
  const value = Number(raw.trim());
  return Number.isFinite(value) ? value : fallback;
};

function parseAction(name: string, rawArgs: string): TeleopAction | null {
  const args = rawArgs.trim() ? rawArgs.split(",").map((value) => value.trim()) : [];
  const first = args[0] ?? "";
  const normalized = name.toLowerCase();

  if (normalized === "driveforward" || normalized === "move_forward" || normalized === "moveup" || normalized === "move_up") {
    return { type: "drive", direction: "forward", amount: parseNumber(first, 1) };
  }
  if (normalized === "driveback" || normalized === "drivebackward" || normalized === "move_backward" || normalized === "movedown" || normalized === "move_down") {
    return { type: "drive", direction: "backward", amount: parseNumber(first, 1) };
  }
  if (normalized === "driveleft" || normalized === "strafeleft" || normalized === "move_left") {
    return { type: "drive", direction: "left", amount: parseNumber(first, 1) };
  }
  if (normalized === "driveright" || normalized === "straferight" || normalized === "move_right") {
    return { type: "drive", direction: "right", amount: parseNumber(first, 1) };
  }
  if (normalized === "turnleft" || normalized === "rotateleft") {
    return { type: "turn", direction: "left", amount: parseNumber(first, 1) };
  }
  if (normalized === "turnright" || normalized === "rotateright") {
    return { type: "turn", direction: "right", amount: parseNumber(first, 1) };
  }
  if (normalized === "spinflywheel") {
    return { type: "spinFlywheel", rpm: Math.min(6000, Math.max(0, parseNumber(first, 0))) };
  }
  if (normalized === "shoot") {
    return { type: "shoot", angle: Math.min(70, Math.max(20, parseNumber(first, 45))) };
  }
  if (normalized === "intakespinin") return { type: "intake", mode: "in" };
  if (normalized === "intakespinout") return { type: "intake", mode: "out" };
  if (normalized === "intakestopspin" || normalized === "intakestopspini") return { type: "intake", mode: "off" };
  return null;
}

export function parseTeleopBindings(source: string): TeleopBinding[] {
  const normalized = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/[{}]/g, " ");
  const pattern = /if\s*\(\s*gamepad([12])\.([a-zA-Z0-9_]+)\s*(?:(>=|<=|>|<|===|==)\s*(-?\d+(?:\.\d+)?))?\s*\)\s*([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*;?/gi;
  const bindings: TeleopBinding[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalized))) {
    const action = parseAction(match[5], match[6]);
    if (!action) continue;
    bindings.push({
      id: `${match[1]}:${match[2].toLowerCase()}:${bindings.length}`,
      gamepad: Number(match[1]) as 1 | 2,
      control: match[2].toLowerCase(),
      operator: match[3] as TeleopBinding["operator"],
      threshold: match[4] === undefined ? undefined : Number(match[4]),
      action,
    });
  }

  return bindings;
}

function toSnapshot(gamepad: Gamepad | null | undefined): GamepadSnapshot | null {
  if (!gamepad?.connected) return null;
  return {
    index: gamepad.index,
    id: gamepad.id,
    buttons: gamepad.buttons.map((button) => button.pressed),
    buttonValues: gamepad.buttons.map((button) => button.value),
    axes: gamepad.axes.slice(),
  };
}

export function readConnectedGamepads(): Record<1 | 2, GamepadSnapshot | null> {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") return { 1: null, 2: null };
  const gamepads = Array.from(navigator.getGamepads());
  return { 1: toSnapshot(gamepads[0]), 2: toSnapshot(gamepads[1]) };
}

export function readConnectedGamepad(): GamepadSnapshot | null {
  const gamepads = readConnectedGamepads();
  return gamepads[1] || gamepads[2];
}

export function readGamepadControl(gamepad: GamepadSnapshot | null, control: string) {
  if (!gamepad) return 0;
  const axisIndex = AXIS_INDEX[control];
  if (axisIndex !== undefined) {
    const value = gamepad.axes[axisIndex] ?? 0;
    return control.endsWith("_y") ? -value : value;
  }
  const buttonIndex = BUTTON_INDEX[control];
  if (buttonIndex === undefined) return 0;
  if (control === "left_trigger" || control === "right_trigger") return gamepad.buttonValues[buttonIndex] ?? 0;
  return gamepad.buttons[buttonIndex] ? 1 : 0;
}

export function isAnalogControl(control: string) {
  return AXIS_INDEX[control] !== undefined || control === "left_trigger" || control === "right_trigger";
}

export function isBindingActive(binding: TeleopBinding, value: number) {
  if (!binding.operator) return isAnalogControl(binding.control) ? Math.abs(value) >= 0.15 : value > 0.5;
  const threshold = binding.threshold ?? 0;
  if (binding.operator === ">") return value > threshold;
  if (binding.operator === ">=") return value >= threshold;
  if (binding.operator === "<") return value < threshold;
  if (binding.operator === "<=") return value <= threshold;
  return value === threshold;
}
