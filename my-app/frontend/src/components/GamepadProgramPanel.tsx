"use client";

import { GamepadSnapshot, isAnalogControl, isBindingActive, readGamepadControl, TeleopBinding } from "@/lib/teleop";

type GamepadProgramPanelProps = {
  bindings: TeleopBinding[];
  activeGamepads: Record<1 | 2, GamepadSnapshot | null>;
};

const CONTROL_LABELS: Record<string, string> = {
  left_stick_x: "Left stick X",
  left_stick_y: "Left stick Y",
  right_stick_x: "Right stick X",
  right_stick_y: "Right stick Y",
  left_trigger: "Left trigger",
  right_trigger: "Right trigger",
  left_bumper: "Left bumper",
  right_bumper: "Right bumper",
  a: "A button",
  b: "B button",
  x: "X button",
  y: "Y button",
  back: "Back button",
  start: "Start button",
  dpad_up: "D-pad up",
  dpad_down: "D-pad down",
  dpad_left: "D-pad left",
  dpad_right: "D-pad right",
};

const ACTION_LABEL = (action: TeleopBinding["action"]) => {
  switch (action.type) {
    case "drive":
      return `Drive ${action.direction} ${action.amount === 1 ? "(manual)" : `×${action.amount}`}`;
    case "turn":
      return `Turn ${action.direction} ${action.amount === 1 ? "(manual)" : `×${action.amount}`}`;
    case "spinFlywheel":
      return `Spin flywheel ${action.rpm} rpm`;
    case "shoot":
      return `Shoot at ${action.angle}°`;
    case "intake":
      return action.mode === "in" ? "Intake in" : action.mode === "out" ? "Intake out" : "Intake off";
    default:
      return "Unknown action";
  }
};

const getControlLabel = (control: string) => CONTROL_LABELS[control] ?? control.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (binding: TeleopBinding, gamepad: GamepadSnapshot | null) => {
  const value = readGamepadControl(gamepad, binding.control);
  if (isAnalogControl(binding.control)) {
    return `${value.toFixed(2)}`;
  }
  return value > 0.5 ? "pressed" : "released";
};

export function GamepadProgramPanel({ bindings, activeGamepads }: GamepadProgramPanelProps) {
  return (
    <section className="gamepad-program-panel panel">
      <div className="panel-head">
        <div>
          <span className="kicker">DRIVER MODE</span>
          <h2>Gamepad bindings</h2>
          <p>TeleOp maps gamepad1 controls to robot drive and mechanism actions. This panel shows each supported binding and whether it is currently active.</p>
        </div>
      </div>

      {bindings.length === 0 ? (
        <div className="gamepad-program-empty">
          <p>Add `if (gamepad1...)` bindings in the code editor to define TeleOp controls.</p>
          <ul>
            <li><strong>Left stick</strong> → drive forward/back/strafe</li>
            <li><strong>Right stick</strong> → turn or arm control</li>
            <li><strong>Triggers</strong> → analog power for flywheel, elevator, or intake</li>
            <li><strong>Buttons</strong> → discrete actions like shoot, intake, or toggle modes</li>
          </ul>
        </div>
      ) : (
        <div className="binding-grid">
          {bindings.map((binding) => {
            const currentValue = readGamepadControl(activeGamepads[binding.gamepad], binding.control);
            const active = isBindingActive(binding, currentValue);
            return (
              <article key={binding.id} className={`binding-card ${active ? "active" : ""}`}>
                <div className="binding-card-header">
                  <span>{binding.gamepad === 1 ? "Gamepad 1" : "Gamepad 2"}</span>
                  <strong>{getControlLabel(binding.control)}</strong>
                </div>
                <p className="binding-action">{ACTION_LABEL(binding.action)}</p>
                <div className="binding-meta">
                  <span>{binding.operator ? `${binding.operator} ${binding.threshold ?? 0}` : "default"}</span>
                  <span>{formatValue(binding, activeGamepads[binding.gamepad])}</span>
                </div>
                <div className="binding-state">
                  <span>{active ? "ACTIVE" : "inactive"}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
