import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { complexityLevels, getComplexityLevel, type ExperienceLevel } from "@/lib/learning";
import { robotPresets, RobotPresetId } from "@/lib/robots";
import { AllianceColor, ArtifactRowId, ControlMode, CoordinateSystem } from "@/lib/types";

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

const commandReferenceGroups = [
  {
    type: "Drive",
    commands: [
      { name: "driveForward(value)", snippet: "driveForward(24)", detail: "Move forward by inches." },
      { name: "driveBack(value)", snippet: "driveBack(24)", detail: "Move backward by inches." },
      { name: "driveLeft(value)", snippet: "driveLeft(12)", detail: "Strafe left by inches." },
      { name: "driveRight(value)", snippet: "driveRight(12)", detail: "Strafe right by inches." },
      { name: "driveToPosition(x, y)", snippet: "driveToPosition(48, 48)", detail: "Drive to a coordinate while holding heading." },
      { name: "driveToPosition(x, y, heading)", snippet: "driveToPosition(48, 48, 90)", detail: "Drive to a coordinate while turning to heading." },
      { name: "turn(value)", snippet: "turn(90)", detail: "Turn in place to an absolute heading in degrees." },
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
      { name: "intakeMotor.setPower(value)", snippet: "intakeMotor.setPower(1)", detail: "Positive power collects; negative power reverses." },
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
      { name: "shoot()", snippet: "shoot()", detail: "Shoot one loaded artifact at 45 degrees." },
      { name: "shoot(value)", snippet: "shoot(45)", detail: "Shoot one loaded artifact at 20 to 70 degrees." },
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
  const selectedScenario = activeLevel.scenarios.find((scenario) => scenario.id === selectedScenarioId) || activeLevel.scenarios[0];
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
    if (experienceLevel === "beginner") {
      return commandReferenceGroups.filter((group) => group.type === "Drive" || group.type === "Shooter" || group.type === "Intake");
    }

    const motorGroups = commandReferenceGroups
      .filter((group) => group.type === "Motor power" || group.type === "Shooter" || group.type === "Timing")
      .map((group) => {
        if (group.type === "Shooter") return { ...group, commands: group.commands.filter((command) => command.name.startsWith("shoot")) };
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
  }, [experienceLevel]);
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
        <strong>Level {activeLevel.number} commands</strong>
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
      <div className="panel-head input-panel-head">
        <div>
          <h2>{learningMode && experienceLevel === "beginner" ? "Your first mission" : learningMode ? "Guided lab" : "Simulation setup"}</h2>
          <p>{learningMode && experienceLevel === "beginner" ? "The robot is ready. Read the goal, then press Run." : learningMode ? "Follow the level guidance, then test your changes." : "Configure the robot code and virtual robot."}</p>
        </div>
      </div>

      <section className="setup-section mode-section">
        <label className="form-label">Simulation mode</label>
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
      </section>

      {controlMode === "autonomous" && !learningMode && <section className="setup-section complexity-section">
        <label className="form-label">Code complexity</label>
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
      </section>}

      {controlMode === "autonomous" && learningMode && <section className="setup-section learning-scenario-section">
          <label className="form-label" htmlFor="learning-scenario">Scenario</label>
          <div className="select-wrap">
            <select id="learning-scenario" value={selectedScenario.id} onChange={(event) => setSelectedScenarioId(event.target.value)}>
              {activeLevel.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.number} · {scenario.title}</option>)}
            </select>
            <span>v</span>
          </div>
          <div className="scenario-brief">
            <strong>{selectedScenario.title}</strong>
            <span className="scenario-focus">Focus · {selectedScenario.focus}</span>
            <p>{selectedScenario.description}</p>
            <ul>{selectedScenario.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          </div>
      </section>}

      {learningMode && experienceLevel === "beginner" && <div className="beginner-tip"><b>NEW HERE?</b><span>Code is just a list of instructions. The robot reads them from top to bottom.</span></div>}

      <section className="setup-section goal-section">
        <label className="form-label" htmlFor="goal">{learningMode ? "Learning objective" : "Robot goal"}</label>
        {learningMode && <p className="objective-focus"><span>FOCUS</span>{selectedScenario.focus}</p>}
        <textarea id="goal" className="goal-input" value={goal} readOnly={learningMode} onChange={(event) => setGoal(event.target.value)} />
      </section>

      <section className="setup-section code-section">
        <div className="input-label-row">
          <label className="form-label" htmlFor="code">Robot code</label>
          <span>LEVEL {activeLevel.number} · {activeLevel.title.toUpperCase()}</span>
        </div>
        <textarea id="code" spellCheck={false} className="code-input" value={code} onChange={(event) => setCode(event.target.value)} />
        <div className="command-reference-dock">
          <button type="button" className="artifact-row-toggle command-reference-toggle" onClick={() => setShowCommandReference((open) => !open)}>
            <span>{showCommandReference ? "Hide command reference" : "Command reference"}</span>
            <b>{showCommandReference ? "-" : "+"}</b>
          </button>
        </div>
      </section>

      {(!learningMode || experienceLevel !== "beginner") && <section className="setup-section robot-configurator">
        <div className="config-title">
          <div>
            <label className="form-label">Robot preset</label>
            <p>Select a starting configuration.</p>
          </div>
        </div>
        <div className="select-wrap robot-select">
          <select value={robotId} onChange={(event) => onRobot(event.target.value as RobotPresetId)}>
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
            <select value={allianceColor} onChange={(event) => setAllianceColor(event.target.value as AllianceColor)}>
              <option value="blue">Blue</option>
              <option value="red">Red</option>
            </select>
            <span>v</span>
          </div>
        </div>
      </section>}

      {(!learningMode || experienceLevel === "advanced") && <section className="setup-section field-configurator">
        <div className="config-title">
          <div>
            <label className="form-label">Field configuration</label>
          </div>
        </div>
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
          <select value={coordinateSystem} onChange={(event) => setCoordinateSystem(event.target.value as CoordinateSystem)}>
            <option value="corner">Corner origin - 0,0 at bottom left field corner</option>
            <option value="center">Center origin - 0,0 at field center</option>
          </select>
          <span>v</span>
        </div>
        <div className="field-config-subtitle">Add preload</div>
        <div className="preload-control">
          <span>Artifacts in robot</span>
          <div className="select-wrap preload-select">
            <select value={preloadCount} onChange={(event) => setPreloadCount(Number(event.target.value))}>
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
      </section>}

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
        <button className="button analyze-button" disabled={!canAnalyze || running || analyzing} onClick={onAnalyze}>
          <span>*</span>
          {analyzing ? "Analyzing run..." : learningMode && experienceLevel === "beginner" ? "Ask the coach what happened" : "Get AI feedback"}
        </button>
        {setupWarning && <p className="action-warning">{setupWarning}</p>}
        {!canAnalyze && !running && <p className="action-hint">Run the simulation to unlock AI feedback.</p>}
      </div>
    </aside>
    {mounted && commandReferenceWindow ? createPortal(commandReferenceWindow, document.body) : null}
    </>
  );
}
