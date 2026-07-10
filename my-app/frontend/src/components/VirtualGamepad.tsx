"use client";

import { Dispatch, SetStateAction, useRef } from "react";
import { GamepadSnapshot, readGamepadControl, setVirtualGamepadAxis, setVirtualGamepadButton } from "@/lib/teleop";

type VirtualGamepadProps = {
  value: GamepadSnapshot;
  onChange: Dispatch<SetStateAction<GamepadSnapshot>>;
  physicalConnected: boolean;
  teleopActive: boolean;
};

type HoldButtonProps = {
  control: string;
  label: string;
  snapshot: GamepadSnapshot;
  onChange: Dispatch<SetStateAction<GamepadSnapshot>>;
  className?: string;
};

type StickProps = {
  label: string;
  xControl: string;
  yControl: string;
  snapshot: GamepadSnapshot;
  onChange: Dispatch<SetStateAction<GamepadSnapshot>>;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function HoldButton({ control, label, snapshot, onChange, className = "" }: HoldButtonProps) {
  const pressed = readGamepadControl(snapshot, control) > 0.5;
  const setPressed = (value: number) => onChange((current) => setVirtualGamepadButton(current, control, value));

  return (
    <button
      type="button"
      className={`virtual-button ${pressed ? "pressed" : ""} ${className}`}
      aria-label={label}
      aria-pressed={pressed}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(1);
      }}
      onPointerUp={() => setPressed(0)}
      onPointerCancel={() => setPressed(0)}
      onLostPointerCapture={() => setPressed(0)}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) setPressed(1);
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") setPressed(0);
      }}
    >
      {label}
    </button>
  );
}

function VirtualStick({ label, xControl, yControl, snapshot, onChange }: StickProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const x = readGamepadControl(snapshot, xControl);
  const y = readGamepadControl(snapshot, yControl);

  const updateFromPointer = (clientX: number, clientY: number) => {
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
        className="virtual-stick-surface"
        role="group"
        aria-label={`${label} stick`}
        onPointerDown={(event) => {
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

function Trigger({ control, label, snapshot, onChange }: HoldButtonProps) {
  const value = readGamepadControl(snapshot, control);
  return (
    <label className="virtual-trigger">
      <span>{label}</span>
      <input
        aria-label={`${label} trigger`}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(event) => onChange((current) => setVirtualGamepadButton(current, control, Number(event.target.value)))}
      />
      <small>{Math.round(value * 100)}%</small>
    </label>
  );
}

export function VirtualGamepad({ value, onChange, physicalConnected, teleopActive }: VirtualGamepadProps) {
  return (
    <section className={`virtual-gamepad panel ${teleopActive ? "active" : ""}`}>
      <div className="virtual-gamepad-head">
        <div>
          <span className="virtual-gamepad-kicker">INPUT DEVICE</span>
          <h2>Virtual Gamepad</h2>
          <p>Mouse controls send the same gamepad1 input as a connected controller.</p>
        </div>
        <div className={`virtual-gamepad-status ${physicalConnected ? "physical" : "virtual"}`}>
          <i />
          {physicalConnected ? "PHYSICAL GAMEPAD CONNECTED" : teleopActive ? "MOUSE INPUT ACTIVE" : "VIRTUAL GAMEPAD READY"}
        </div>
      </div>

      <div className="virtual-gamepad-console">
        <div className="virtual-gamepad-side">
          <div className="virtual-trigger-bank">
            <Trigger control="left_trigger" label="LT" snapshot={value} onChange={onChange} />
            <HoldButton control="left_bumper" label="LB" snapshot={value} onChange={onChange} />
          </div>
          <VirtualStick label="MOVE" xControl="left_stick_x" yControl="left_stick_y" snapshot={value} onChange={onChange} />
          <div className="virtual-dpad" aria-label="D-pad">
            <HoldButton control="dpad_up" label="UP" snapshot={value} onChange={onChange} />
            <HoldButton control="dpad_left" label="LEFT" snapshot={value} onChange={onChange} />
            <span className="virtual-dpad-center" aria-hidden="true" />
            <HoldButton control="dpad_right" label="RIGHT" snapshot={value} onChange={onChange} />
            <HoldButton control="dpad_down" label="DOWN" snapshot={value} onChange={onChange} />
          </div>
        </div>

        <div className="virtual-gamepad-center">
          <div className="virtual-gamepad-brand"><span>R</span> ROBOLAB <b>FTC</b></div>
          <div className="virtual-system-buttons">
            <HoldButton control="back" label="BACK" snapshot={value} onChange={onChange} />
            <HoldButton control="start" label="START" snapshot={value} onChange={onChange} />
          </div>
          <div className="virtual-gamepad-hint">ENABLE TELEOP TO DRIVE</div>
        </div>

        <div className="virtual-gamepad-side right">
          <div className="virtual-action-cluster">
            <HoldButton control="y" label="Y" snapshot={value} onChange={onChange} className="action-y" />
            <HoldButton control="x" label="X" snapshot={value} onChange={onChange} className="action-x" />
            <HoldButton control="b" label="B" snapshot={value} onChange={onChange} className="action-b" />
            <HoldButton control="a" label="A" snapshot={value} onChange={onChange} className="action-a" />
          </div>
          <VirtualStick label="TURN" xControl="right_stick_x" yControl="right_stick_y" snapshot={value} onChange={onChange} />
          <div className="virtual-trigger-bank">
            <HoldButton control="right_bumper" label="RB" snapshot={value} onChange={onChange} />
            <Trigger control="right_trigger" label="RT" snapshot={value} onChange={onChange} />
          </div>
        </div>
      </div>
    </section>
  );
}
