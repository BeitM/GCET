"use client";

import { useRef } from "react";
import { GamepadSnapshot, readGamepadControl, setVirtualGamepadAxis, setVirtualGamepadButton } from "@/lib/teleop";

type GamepadUpdater = (current: GamepadSnapshot) => GamepadSnapshot;

type VirtualGamepadProps = {
  driverLabel?: string;
  virtualValue: GamepadSnapshot;
  onChange: (update: GamepadUpdater) => void;
  physicalGamepad: GamepadSnapshot | null;
  teleopActive: boolean;
};

type HoldButtonProps = {
  control: string;
  label: string;
  icon?: string;
  snapshot: GamepadSnapshot;
  onChange: (update: GamepadUpdater) => void;
  className?: string;
  disabled?: boolean;
};

type StickProps = {
  label: string;
  xControl: string;
  yControl: string;
  snapshot: GamepadSnapshot;
  onChange: (update: GamepadUpdater) => void;
  disabled?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function HoldButton({ control, label, icon, snapshot, onChange, className = "", disabled = false }: HoldButtonProps) {
  const pressed = readGamepadControl(snapshot, control) > 0.5;
  const setPressed = (value: number) => onChange((current) => setVirtualGamepadButton(current, control, value));

  return (
    <button
      type="button"
      className={`virtual-button ${pressed ? "pressed" : ""} ${icon ? "icon-button" : ""} ${className}`}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      aria-disabled={disabled}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (disabled) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(1);
      }}
      onPointerUp={() => { if (!disabled) setPressed(0); }}
      onPointerCancel={() => { if (!disabled) setPressed(0); }}
      onLostPointerCapture={() => { if (!disabled) setPressed(0); }}
      onKeyDown={(event) => {
        if (disabled) return;
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) setPressed(1);
      }}
      onKeyUp={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") setPressed(0);
      }}
    >
      <span className="virtual-button-inner">{icon ?? label}</span>
    </button>
  );
}

function VirtualStick({ label, xControl, yControl, snapshot, onChange, disabled = false }: StickProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const x = readGamepadControl(snapshot, xControl);
  const y = readGamepadControl(snapshot, yControl);

  const updateFromPointer = (clientX: number, clientY: number) => {
    if (disabled) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const bounds = surface.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const nextX = clamp((clientX - centerX) / (bounds.width * 0.38), -1, 1);
    const nextY = clamp((centerY - clientY) / (bounds.height * 0.38), -1, 1);
    onChange((current) => setVirtualGamepadAxis(
      setVirtualGamepadAxis(current, xControl, nextX),
      yControl,
      nextY,
    ));
  };

  const releaseStick = () => {
    if (disabled) return;
    onChange((current) => setVirtualGamepadAxis(
      setVirtualGamepadAxis(current, xControl, 0),
      yControl,
      0,
    ));
  };

  return (
    <div className="virtual-stick-unit">
      <div
        ref={surfaceRef}
        className={`virtual-stick-surface ${disabled ? "disabled" : ""}`}
        role="group"
        aria-label={`${label} stick`}
        aria-disabled={disabled}
        onPointerDown={(event) => {
          if (disabled) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
        onLostPointerCapture={releaseStick}
      >
        <span className="virtual-stick-crosshair" aria-hidden="true" />
        <i className="virtual-stick-knob" style={{ transform: `translate(${x * 30}px, ${-y * 30}px)` }} />
      </div>
      <span className="virtual-control-label">{label}</span>
      <small>{x.toFixed(2)} / {y.toFixed(2)}</small>
    </div>
  );
}

function Trigger({ control, label, snapshot, onChange, disabled }: HoldButtonProps) {
  const value = readGamepadControl(snapshot, control);
  return (
    <label className={`virtual-trigger ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <input
        aria-label={`${label} trigger`}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange((current) => setVirtualGamepadButton(current, control, Number(event.target.value)))}
      />
      <small>{Math.round(value * 100)}%</small>
    </label>
  );
}

export function VirtualGamepad({ driverLabel, virtualValue, onChange, physicalGamepad, teleopActive }: VirtualGamepadProps) {
  const displaySnapshot = physicalGamepad ?? virtualValue;
  const isPhysical = Boolean(physicalGamepad);
  const gamepadName = driverLabel === "Driver B" ? "gamepad2" : "gamepad1";

  return (
    <section className={`virtual-gamepad panel ${teleopActive ? "active" : ""}`}>
      <div className="virtual-gamepad-head">
        <div>
          <span className="virtual-gamepad-kicker">INPUT DEVICE</span>
          <h2>{driverLabel ? `${driverLabel} controller` : "Logi-style Virtual Gamepad"}</h2>
          <p>{isPhysical ? "External controller input is active. The on-screen gamepad mirrors the connected hardware." : `Mouse controls send the same ${gamepadName} input as a connected controller.`}</p>
        </div>
        <div className={`virtual-gamepad-status ${isPhysical ? "physical" : "virtual"}`}>
          <i />
          {isPhysical ? "PHYSICAL GAMEPAD CONNECTED" : teleopActive ? "MOUSE INPUT ACTIVE" : "VIRTUAL GAMEPAD READY"}
        </div>
      </div>

      <div className="virtual-gamepad-shell">
        <div className="virtual-gamepad-console">
          <div className="virtual-gamepad-side">
            <div className="virtual-trigger-bank">
              <Trigger control="left_trigger" label="LT" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
              <HoldButton control="left_bumper" label="LB" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
            </div>
            <VirtualStick label="MOVE" xControl="left_stick_x" yControl="left_stick_y" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
            <div className="virtual-dpad" aria-label="D-pad">
              <HoldButton control="dpad_up" label="D-pad up" icon="↑" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
              <HoldButton control="dpad_left" label="D-pad left" icon="←" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
              <span className="virtual-dpad-center" aria-hidden="true" />
              <HoldButton control="dpad_right" label="D-pad right" icon="→" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
              <HoldButton control="dpad_down" label="D-pad down" icon="↓" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
            </div>
          </div>

          <div className="virtual-gamepad-center">
            <div className="virtual-gamepad-brand"><span>R</span> ROBOLAB <b>FTC</b></div>
            <div className="virtual-system-buttons">
              <HoldButton control="back" label="Back button" icon="≡" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
              <HoldButton control="start" label="Start button" icon="▶" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
            </div>
            <div className="virtual-gamepad-hint">ENABLE TELEOP TO DRIVE</div>
          </div>

          <div className="virtual-gamepad-side right">
            <div className="virtual-action-cluster">
              <HoldButton control="y" label="Y button" icon="Y" snapshot={displaySnapshot} onChange={onChange} className="action-y" disabled={isPhysical} />
              <HoldButton control="x" label="X button" icon="X" snapshot={displaySnapshot} onChange={onChange} className="action-x" disabled={isPhysical} />
              <HoldButton control="b" label="B button" icon="B" snapshot={displaySnapshot} onChange={onChange} className="action-b" disabled={isPhysical} />
              <HoldButton control="a" label="A button" icon="A" snapshot={displaySnapshot} onChange={onChange} className="action-a" disabled={isPhysical} />
            </div>
            <VirtualStick label="TURN" xControl="right_stick_x" yControl="right_stick_y" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
            <div className="virtual-trigger-bank">
              <HoldButton control="right_bumper" label="Right bumper" icon="RB" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
              <Trigger control="right_trigger" label="RT" snapshot={displaySnapshot} onChange={onChange} disabled={isPhysical} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
