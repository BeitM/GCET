import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { complexityLevels, getComplexityLevel, type ExperienceLevel } from "@/lib/learning";
import type { LearningCheckResult } from "@/lib/learningEvaluation";
import { robotPresets, RobotPresetId } from "@/lib/robots";
import { AllianceColor, ArtifactRowId, ControlMode, CoordinateSystem } from "@/lib/types";
import { RobotCodeEditor, type RobotCodeCompletion } from "@/components/RobotCodeEditor";

const artifactRowOptions: { id: ArtifactRowId; label: string }[] = [
  { id: "topLoading", label: "Blue Loading Zone" },
  { id: "topRight", label: "Blue 1" },
  { id: "topCenter", label: "Blue 2" },
  { id: "topLeft", label: "Blue 3" },
  { id: "bottomLoading", label: "Red Loading Zone" },
  { id: "bottomRight", label: "Red 1" },
  { id: "bottomCenter", label: "Red 2" },
  { id: "bottomLeft", label: "Red 3" },
];

type CommandReferenceGroup = {
  type: string;
  commands: { name: string; snippet: string; detail: string }[];
};

function autocompleteCall(snippet: string) {
  const openParenthesis = snippet.indexOf("(");
  const closeParenthesis = snippet.lastIndexOf(")");
  if (openParenthesis < 0 || closeParenthesis <= openParenthesis) return snippet;
  return `${snippet.slice(0, openParenthesis + 1)}${snippet.slice(closeParenthesis)}`;
}

const commandReferenceGroups: CommandReferenceGroup[] = [
  {
    type: "Drive",
    commands: [
      { name: "driveForward(value)", snippet: "driveForward(24)", detail: "Move forward by inches." },
      { name: "driveBack(value)", snippet: "driveBack(24)", detail: "Move backward by inches." },
      { name: "driveLeft(value)", snippet: "driveLeft(12)", detail: "Strafe left by inches." },
      { name: "driveRight(value)", snippet: "driveRight(12)", detail: "Strafe right by inches." },
      { name: "driveToPosition(x, y)", snippet: "driveToPosition(48, 48)", detail: "Drive to a coordinate while holding heading." },
      { name: "driveToPosition(x, y, heading)", snippet: "driveToPosition(48, 48, 90)", detail: "Drive to a coordinate while turning to heading." },
      { name: "turn(degrees)", snippet: "turn(90)", detail: "Rotate by degrees relative to the robot's current heading." },
      { name: "turnTo(heading)", snippet: "turnTo(90)", detail: "Turn in place to an absolute field heading." },
    ],
  },
  {
    type: "Motor power",
    commands: [
      { name: "frontLeftDrive.setPower(value)", snippet: "frontLeftDrive.setPower(0.6)", detail: "Set front-left drive power from -1.0 to 1.0." },
      { name: "frontRightDrive.setPower(value)", snippet: "frontRightDrive.setPower(0.6)", detail: "Set front-right drive power from -1.0 to 1.0." },
      { name: "rearLeftDrive.setPower(value)", snippet: "rearLeftDrive.setPower(0.6)", detail: "Set rear-left drive power from -1.0 to 1.0." },
      { name: "rearRightDrive.setPower(value)", snippet: "rearRightDrive.setPower(0.6)", detail: "Set rear-right drive power from -1.0 to 1.0." },
      { name: "setDriveMotorPowers(fl, fr, rl, rr)", snippet: "setDriveMotorPowers(0.6, 0.6, 0.6, 0.6)", detail: "Set all four mecanum drive channels together." },
      { name: "intake.setPower(value)", snippet: "intake.setPower(1)", detail: "Positive power collects; negative power reverses." },
      { name: "leftFlywheel.setPower(value)", snippet: "leftFlywheel.setPower(0.8)", detail: "Set the left shooter motor power." },
      { name: "rightFlywheel.setPower(value)", snippet: "rightFlywheel.setPower(-0.8)", detail: "Set the mirrored right shooter motor power." },
      { name: "turretMotor.setPower(value)", snippet: "turretMotor.setPower(0.2)", detail: "Rotate the turret gearbox at proportional speed." },
      { name: "stopDriveMotors()", snippet: "stopDriveMotors()", detail: "Stop all four drive channels." },
      { name: "stopAllMotors()", snippet: "stopAllMotors()", detail: "Stop drive and every powered mechanism." },
    ],
  },
  {
    type: "Shooter",
    commands: [
      { name: "spinFlywheel(value)", snippet: "spinFlywheel(3600)", detail: "Ramp flywheel to target RPM." },
      { name: "setHoodAngle(value)", snippet: "setHoodAngle(60)", detail: "Move the turret hood to a 20 to 70 degree launch angle without firing." },
      { name: "shoot()", snippet: "shoot()", detail: "Shoot one loaded artifact using the current hood angle." },
      { name: "shoot(value)", snippet: "shoot(45)", detail: "Level 1 shortcut: move the hood to an angle and fire." },
    ],
  },
  {
    type: "Intake",
    commands: [
      { name: "intakeSpinIn()", snippet: "intakeSpinIn()", detail: "Run intake inward and collect artifacts on contact." },
      { name: "intakeSpinOut()", snippet: "intakeSpinOut()", detail: "Release loaded artifacts." },
      { name: "intakeStopSpin()", snippet: "intakeStopSpin()", detail: "Stop the intake." },
    ],
  },
  {
    type: "Timing",
    commands: [
      { name: "wait(value)", snippet: "wait(1)", detail: "Advance for seconds while current motor powers remain active." },
    ],
  },
];

const teleopCommandReferenceGroups: CommandReferenceGroup[] = [
  {
    type: "Drive bindings",
    commands: [
      { name: "driveForward(value)", snippet: "driveForward(1)", detail: "Drive forward while the binding is active." },
      { name: "driveBackward(value)", snippet: "driveBackward(1)", detail: "Drive backward while the binding is active." },
      { name: "driveLeft(value)", snippet: "driveLeft(1)", detail: "Strafe left while the binding is active." },
      { name: "driveRight(value)", snippet: "driveRight(1)", detail: "Strafe right while the binding is active." },
      { name: "turnLeft(value)", snippet: "turnLeft(1)", detail: "Turn left while the binding is active." },
      { name: "turnRight(value)", snippet: "turnRight(1)", detail: "Turn right while the binding is active." },
    ],
  },
  {
    type: "Mechanism bindings",
    commands: [
      { name: "spinFlywheel(value)", snippet: "spinFlywheel(3600)", detail: "Set the flywheel RPM while the binding is active." },
      { name: "shoot(value)", snippet: "shoot(60)", detail: "Fire one artifact at the selected hood angle." },
      { name: "intakeSpinIn()", snippet: "intakeSpinIn()", detail: "Run the intake inward." },
      { name: "intakeSpinOut()", snippet: "intakeSpinOut()", detail: "Run the intake outward." },
      { name: "intakeStopSpin()", snippet: "intakeStopSpin()", detail: "Stop the intake." },
    ],
  },
];

const teleopGamepadControls = [
  "a", "b", "x", "y", "left_bumper", "right_bumper", "left_trigger", "right_trigger",
  "left_stick_x", "left_stick_y", "right_stick_x", "right_stick_y", "dpad_up", "dpad_down",
  "dpad_left", "dpad_right", "start", "back",
];

type InputPanelProps = {
  controlMode: ControlMode;
  setControlMode: (value: ControlMode) => void;
  learningMode: boolean;
  experienceLevel: ExperienceLevel;
  setExperienceLevel: (value: ExperienceLevel) => void;
  selectedScenarioId: string;
  setSelectedScenarioId: (value: string) => void;
  goal: string;
  setGoal: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  onRun: () => void;
  onStop: () => void;
  running: boolean;
  onCheckSolution: () => void;
  lessonCheck: LearningCheckResult | null;
  onAnalyze: () => void;
  analyzing: boolean;
  canAnalyze: boolean;
  robotId: RobotPresetId;
  onRobot: (id: RobotPresetId) => void;
  allianceColor: AllianceColor;
  setAllianceColor: (value: AllianceColor) => void;
  coordinateSystem: CoordinateSystem;
  setCoordinateSystem: (value: CoordinateSystem) => void;
  startX: number;
  startY: number;
  startHeading: number;
  setStartX: (value: number) => void;
  setStartY: (value: number) => void;
  setStartHeading: (value: number) => void;
  selectedArtifactRows: ArtifactRowId[];
  setSelectedArtifactRows: (value: ArtifactRowId[]) => void;
  preloadCount: number;
  setPreloadCount: (value: number) => void;
  setupWarning: string;
};

function SetupSection({
  title,
  className,
  children,
  onToggle,
  defaultOpen = false,
}: {
  title: string;
  className: string;
  children: ReactNode;
  onToggle?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  return (
    <details className={`setup-section ${className}`} open={defaultOpen} onToggle={(event) => onToggle?.(event.currentTarget.open)}>
      <summary className="setup-section-summary">
        <span>{title}</span>
        <i aria-hidden="true" />
      </summary>
      <div className="setup-section-body">{children}</div>
    </details>
  );
}

function NumberDraftInput({
  ariaLabel,
  value,
  min,
  max,
  unit,
  onCommit,
}: {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(Number(value.toFixed(1))));

  useEffect(() => {
    const syncDraft = window.setTimeout(() => setDraft(String(Number(value.toFixed(1)))), 0);
    return () => window.clearTimeout(syncDraft);
  }, [value]);
  const [editing, setEditing] = useState(false);
  const displayValue = String(Number(value.toFixed(1)));

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      onCommit(0);
      setDraft("0");
      setEditing(false);
      return;
    }

    const next = Number(trimmed);
    if (Number.isFinite(next)) {
      onCommit(Math.min(max, Math.max(min, next)));
      setEditing(false);
      return;
    }

    setEditing(false);
  };

  return (
    <div>
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        type="text"
        value={editing ? draft : displayValue}
        onFocus={() => {
          setDraft(displayValue);
          setEditing(true);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          setEditing(true);
          if (next.trim() === "" || next === "-" || next === "." || next === "-.") return;
          const parsed = Number(next);
          if (Number.isFinite(parsed)) onCommit(Math.min(max, Math.max(min, parsed)));
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <b>{unit}</b>
    </div>
  );
}

export function InputPanel({
  controlMode,
  setControlMode,
  learningMode,
  experienceLevel,
  setExperienceLevel,
  selectedScenarioId,
  setSelectedScenarioId,
  goal,
  setGoal,
  code,
  setCode,
  onRun,
  onStop,
  running,
  onCheckSolution,
  lessonCheck,
  onAnalyze,
  analyzing,
  canAnalyze,
  robotId,
  onRobot,
  allianceColor,
  setAllianceColor,
  coordinateSystem,
  setCoordinateSystem,
  startX,
  startY,
  startHeading,
  setStartX,
  setStartY,
  setStartHeading,
  selectedArtifactRows,
  setSelectedArtifactRows,
  preloadCount,
  setPreloadCount,
  setupWarning,
}: InputPanelProps) {
  const selectedRobot = robotPresets.find((robot) => robot.id === robotId);
  const activeLevel = getComplexityLevel(experienceLevel);
  const allScenarios = complexityLevels.flatMap((level) => level.scenarios);
  const selectedScenario = allScenarios.find((scenario) => scenario.id === selectedScenarioId) || activeLevel.scenarios[0];
  const [showArtifactRows, setShowArtifactRows] = useState(false);
  const [showCommandReference, setShowCommandReference] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [commandWindowOffset, setCommandWindowOffset] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const dragStart = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const coordinateBounds = coordinateSystem === "center"
    ? { min: -72, max: 72, detail: "Center origin" }
    : { min: 0, max: 144, detail: "Corner origin" };
  const activeCommandGroups = useMemo(() => {
    if (controlMode === "teleop") return teleopCommandReferenceGroups;
    if (experienceLevel === "beginner") {
      return commandReferenceGroups
        .filter((group) => group.type === "Drive" || group.type === "Shooter" || group.type === "Intake")
        .map((group) => group.type === "Shooter"
          ? { ...group, commands: group.commands.filter((command) => command.name !== "setHoodAngle(value)") }
          : group);
    }

    const motorGroups = commandReferenceGroups
      .filter((group) => group.type === "Motor power" || group.type === "Shooter" || group.type === "Timing")
      .map((group) => {
        if (group.type === "Shooter") return {
          ...group,
          commands: group.commands.filter((command) => command.name === "setHoodAngle(value)" || command.name === "shoot()"),
        };
        if (group.type === "Timing" && experienceLevel === "advanced") {
          return {
            ...group,
            type: "LinearOpMode timing",
            commands: [
              { name: "waitForStart()", snippet: "waitForStart()", detail: "Mark the FTC autonomous start point." },
              { name: "sleep(milliseconds)", snippet: "sleep(1000)", detail: "Advance time in milliseconds while current motor powers remain active." },
            ],
          };
        }
        return group;
      });
    return motorGroups;
  }, [controlMode, experienceLevel]);
  const editorCompletions = useMemo<RobotCodeCompletion[]>(() => [
    ...activeCommandGroups.flatMap((group) => group.commands.map((command) => ({
      label: command.name,
      insertText: `${autocompleteCall(command.snippet)};`,
      detail: command.detail,
      group: group.type,
      kind: "function" as const,
    }))),
    ...(controlMode === "teleop" ? teleopGamepadControls.map((control) => ({
      label: `gamepad1.${control}`,
      insertText: `gamepad1.${control}`,
      detail: control.includes("stick") ? "Gamepad axis" : control.includes("trigger") ? "Analog trigger" : "Gamepad button",
      group: "gamepad1",
      kind: "field" as const,
    })) : []),
  ], [activeCommandGroups, controlMode]);
  const filteredCommandGroups = useMemo(() => {
    const query = commandSearch.trim().toLowerCase();
    if (!query) return activeCommandGroups;

    return activeCommandGroups
      .map((group) => ({
        ...group,
        commands: group.commands.filter((command) => `${command.name} ${command.detail} ${group.type}`.toLowerCase().includes(query)),
      }))
      .filter((group) => group.commands.length > 0);
  }, [activeCommandGroups, commandSearch]);

  const beginCommandWindowDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: commandWindowOffset.x,
      y: commandWindowOffset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragCommandWindow = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setCommandWindowOffset({
      x: dragStart.current.x + event.clientX - dragStart.current.pointerX,
      y: dragStart.current.y + event.clientY - dragStart.current.pointerY,
    });
  };

  const endCommandWindowDrag = () => {
    dragStart.current = null;
  };
  const commandReferenceWindow = showCommandReference ? (
    <div
      className="command-reference-window"
      role="dialog"
      aria-label="Robot command reference"
      style={{ transform: `translate(${commandWindowOffset.x}px, ${commandWindowOffset.y}px)` }}
    >
      <div
        className="command-reference-titlebar"
        onPointerDown={beginCommandWindowDrag}
        onPointerMove={dragCommandWindow}
        onPointerUp={endCommandWindowDrag}
        onPointerCancel={endCommandWindowDrag}
      >
        <strong>{controlMode === "teleop" ? "TeleOp commands" : `Level ${activeLevel.number} commands`}</strong>
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
            dragStart.current = null;
          }}
          onClick={() => setShowCommandReference(false)}
          aria-label="Close command reference"
        >
          x
        </button>
      </div>
      <input
        aria-label="Search robot commands"
        className="command-reference-search"
        value={commandSearch}
        onChange={(event) => setCommandSearch(event.target.value)}
        placeholder="Search commands"
      />
      <div className="command-reference-list">
        {filteredCommandGroups.map((group) => (
          <section key={group.type}>
            <h3>{group.type}</h3>
            {group.commands.map((command) => (
              <button key={command.name} type="button" onClick={() => setCode(`${code}${code.trim() ? "\n" : ""}${command.snippet};`)}>
                <code>{command.name}</code>
                <span>{command.detail}</span>
              </button>
            ))}
          </section>
        ))}
        {filteredCommandGroups.length === 0 && <p>No commands found.</p>}
      </div>
    </div>
  ) : null;

  useEffect(() => {
    const mountTimer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(mountTimer);
  }, []);

  return (
    <>
    <aside className="input-panel panel">
      <div className="input-panel-scroll">
        <div className="panel-head input-panel-head">
          <div>
            <h2>{learningMode && experienceLevel === "beginner" ? "Your first mission" : learningMode ? "Guided lab" : "Simulation setup"}</h2>
            <p>{learningMode && experienceLevel === "beginner" ? "The robot is ready. Review the instructions, then press Run." : learningMode ? "Follow the level guidance, then test your changes." : "Configure the robot code and virtual robot."}</p>
          </div>
        </div>

      <SetupSection
        title={learningMode ? "Learning objective" : "Robot goal"}
        className={learningMode ? "goal-section learning-objective-section" : "goal-section"}
        defaultOpen
      >
        {learningMode ? <>
          <label className="form-label" htmlFor="learning-scenario">Scenario</label>
          <div className="select-wrap">
            <select id="learning-scenario" aria-label="Scenario" value={selectedScenario.id} onChange={(event) => setSelectedScenarioId(event.target.value)}>
              {complexityLevels.map((level) => (
                <optgroup key={level.id} label={`Level ${level.number} · ${level.title}`}>
                  {level.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.number} · {scenario.title}</option>)}
                </optgroup>
              ))}
            </select>
            <span>v</span>
          </div>
          <div className="learning-instructions">
            <span>Instructions</span>
            <ul>{selectedScenario.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          </div>
        </> : <>
          <textarea
            id="goal"
            aria-label="Robot goal"
            className="goal-input"
            value={goal}
            placeholder="Describe what you want the robot to accomplish in this run."
            onChange={(event) => setGoal(event.target.value)}
          />
          <p className="goal-help">Describe the result you want. Feedback will compare the run against this goal.</p>
        </>}
      </SetupSection>

      <SetupSection
        title="Robot code"
        className="code-section"
        onToggle={(open) => {
          if (!open) setShowCommandReference(false);
        }}
        defaultOpen
      >
        <RobotCodeEditor
          id="code"
          value={code}
          onChange={setCode}
          controlMode={controlMode}
          levelNumber={activeLevel.number}
          completions={editorCompletions}
          commandReferenceOpen={showCommandReference}
          onToggleCommandReference={() => setShowCommandReference((open) => !open)}
        />
      </SetupSection>

      {!learningMode && <SetupSection title="Simulation mode" className="mode-section">
        <div className={`mode-toggle ${controlMode}`} role="group" aria-label="Simulation mode">
          <button
            type="button"
            className={controlMode === "autonomous" ? "active" : ""}
            aria-pressed={controlMode === "autonomous"}
            onClick={() => setControlMode("autonomous")}
          >
            Autonomous
          </button>
          <button
            type="button"
            className={controlMode === "teleop" ? "active" : ""}
            aria-pressed={controlMode === "teleop"}
            onClick={() => setControlMode("teleop")}
          >
            TeleOp
          </button>
        </div>
      </SetupSection>}

      {controlMode === "autonomous" && !learningMode && <SetupSection title="Code complexity" className="complexity-section">
        <div className="complexity-toggle" role="group" aria-label="Code complexity level">
          {complexityLevels.map((level) => (
            <button
              key={level.id}
              type="button"
              className={experienceLevel === level.id ? `active ${level.accent}` : level.accent}
              aria-pressed={experienceLevel === level.id}
              onClick={() => setExperienceLevel(level.id)}
            >
              Level {level.number}
            </button>
          ))}
        </div>
        <div className={`complexity-summary ${activeLevel.accent}`}>
          <div><strong>{activeLevel.title}</strong><span>{activeLevel.syntaxLabel}</span></div>
          <p>{activeLevel.syntaxNote}</p>
        </div>
      </SetupSection>}

      {learningMode && experienceLevel === "beginner" && <div className="beginner-tip"><b>NEW HERE?</b><span>Code is just a list of instructions. The robot reads them from top to bottom.</span></div>}

      {(!learningMode || experienceLevel !== "beginner") && <SetupSection title="Robot preset" className="robot-configurator">
        <p className="setup-section-intro">Select a starting configuration.</p>
        <div className="select-wrap robot-select">
          <select aria-label="Robot preset" value={robotId} onChange={(event) => onRobot(event.target.value as RobotPresetId)}>
            {robotPresets.map((robot) => (
              <option key={robot.id} value={robot.id}>{robot.name}</option>
            ))}
          </select>
          <span>v</span>
        </div>
        <div className={`preset-summary ${selectedRobot?.accent}`}>
          <i />
          <span>{selectedRobot?.description}</span>
        </div>
        <button type="button" className="cad-button" disabled><span>+</span> Import CAD <small>Coming later</small></button>
        <div className="field-config-subtitle robot-config-subtitle">Alliance color</div>
        <div className="preload-control alliance-control">
          <span>Alliance color</span>
          <div className="select-wrap preload-select">
            <select aria-label="Alliance color" value={allianceColor} onChange={(event) => setAllianceColor(event.target.value as AllianceColor)}>
              <option value="blue">Blue</option>
              <option value="red">Red</option>
            </select>
            <span>v</span>
          </div>
        </div>
      </SetupSection>}

      {(!learningMode || experienceLevel === "advanced") && <SetupSection title="Field configuration" className="field-configurator">
        <div className="field-config-subtitle">Start position</div>
        <div className="dimension-controls start-pose-controls">
          <label>
            <span>X</span>
            <NumberDraftInput ariaLabel="Robot start X position" min={coordinateBounds.min} max={coordinateBounds.max} value={startX} unit="in" onCommit={setStartX} />
          </label>
          <label>
            <span>Y</span>
            <NumberDraftInput ariaLabel="Robot start Y position" min={coordinateBounds.min} max={coordinateBounds.max} value={startY} unit="in" onCommit={setStartY} />
          </label>
          <label>
            <span>Heading</span>
            <NumberDraftInput ariaLabel="Robot start heading" min={0} max={360} value={startHeading} unit="deg" onCommit={setStartHeading} />
          </label>
        </div>
        <p className="dimension-note"><span>{coordinateBounds.detail}</span> coordinates shown in inches.</p>

        <div className="field-config-subtitle">Coordinate system</div>
        <div className="select-wrap coordinate-system-select">
          <select aria-label="Coordinate system" value={coordinateSystem} onChange={(event) => setCoordinateSystem(event.target.value as CoordinateSystem)}>
            <option value="corner">Corner origin - 0,0 at bottom left field corner</option>
            <option value="center">Center origin - 0,0 at field center</option>
          </select>
          <span>v</span>
        </div>
        <div className="field-config-subtitle">Add preload</div>
        <div className="preload-control">
          <span>Artifacts in robot</span>
          <div className="select-wrap preload-select">
            <select aria-label="Artifacts in robot" value={preloadCount} onChange={(event) => setPreloadCount(Number(event.target.value))}>
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
            <span>v</span>
          </div>
        </div>
        <div className="field-config-subtitle artifact-subtitle">Artifact rows <b>{selectedArtifactRows.length}/{artifactRowOptions.length}</b></div>
        <button type="button" className="artifact-row-toggle" onClick={() => setShowArtifactRows((open) => !open)}>
          <span>{showArtifactRows ? "Hide row selector" : "Configure artifact rows"}</span>
          <b>{showArtifactRows ? "-" : "+"}</b>
        </button>
        {showArtifactRows && (
          <div className="artifact-row-menu">
            {artifactRowOptions.map((option) => (
              <label key={option.id}>
                <input
                  type="checkbox"
                  checked={selectedArtifactRows.includes(option.id)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedArtifactRows([...selectedArtifactRows, option.id]);
                      return;
                    }
                    setSelectedArtifactRows(selectedArtifactRows.filter((id) => id !== option.id));
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </SetupSection>}

      </div>

      <div className="input-actions">
        <button className="button run-button" onClick={onRun} disabled={running}>
          <span>{running ? "■" : "▶"}</span>
          {running
            ? (controlMode === "teleop" ? "TeleOp running..." : "Simulation running...")
            : controlMode === "teleop"
              ? "Start TeleOp"
              : learningMode && experienceLevel === "beginner"
                ? "Run my first mission"
                : "Run simulation"}
        </button>
        {running && (
          <button className="button analyze-button" type="button" onClick={onStop}>
            <span>■</span>
            Stop simulation
          </button>
        )}
        {learningMode && (
          <button className="button check-button" type="button" disabled={!canAnalyze || running} onClick={onCheckSolution}>
            <span>✓</span>
            Check solution
          </button>
        )}
        <button className="button analyze-button" disabled={!canAnalyze || running || analyzing} onClick={onAnalyze}>
          <span>*</span>
          {analyzing ? "Analyzing run..." : "Get AI feedback"}
        </button>
        {learningMode && lessonCheck && (
          <section className={`lesson-check-result ${lessonCheck.passed ? "passed" : "needs-work"}`} aria-live="polite">
            <strong>{lessonCheck.headline}</strong>
            <ul>
              {lessonCheck.details.map((detail) => (
                <li className={detail.passed ? "passed" : "needs-work"} key={detail.message}>
                  <span>{detail.passed ? "✓" : "→"}</span>{detail.message}
                </li>
              ))}
            </ul>
          </section>
        )}
        {setupWarning && <p className="action-warning">{setupWarning}</p>}
        {!canAnalyze && !running && <p className="action-hint">Run the simulation to unlock {learningMode ? "solution checking and AI feedback" : "AI feedback"}.</p>}
      </div>
    </aside>
    {mounted && commandReferenceWindow ? createPortal(commandReferenceWindow, document.body) : null}
    </>
  );
}
