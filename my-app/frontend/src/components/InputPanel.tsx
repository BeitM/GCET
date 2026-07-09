import { useEffect, useState } from "react";
import { robotPresets, RobotPresetId } from "@/lib/robots";
import { ArtifactRowId, CoordinateSystem } from "@/lib/types";

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

type InputPanelProps = {
  goal: string;
  setGoal: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  onRun: () => void;
  onStop: () => void;
  running: boolean;
  onAnalyze: () => void;
  canAnalyze: boolean;
  robotId: RobotPresetId;
  onRobot: (id: RobotPresetId) => void;
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
    setDraft(String(Number(value.toFixed(1))));
  }, [value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      onCommit(0);
      setDraft("0");
      return;
    }

    const next = Number(trimmed);
    if (Number.isFinite(next)) {
      onCommit(Math.min(max, Math.max(min, next)));
      return;
    }

    setDraft(String(Number(value.toFixed(1))));
  };

  return (
    <div>
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        type="text"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
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
  goal,
  setGoal,
  code,
  setCode,
  onRun,
  onStop,
  running,
  onAnalyze,
  canAnalyze,
  robotId,
  onRobot,
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
  const [showArtifactRows, setShowArtifactRows] = useState(false);
  const coordinateBounds = coordinateSystem === "center"
    ? { min: -72, max: 72, detail: "Center origin" }
    : { min: 0, max: 144, detail: "Corner origin" };

  return (
    <aside className="input-panel panel">
      <div className="panel-head input-panel-head">
        <div>
          <h2>Simulation setup</h2>
          <p>Configure the robot code and virtual robot.</p>
        </div>
      </div>

      <section className="setup-section goal-section">
        <label className="form-label" htmlFor="goal">Robot goal</label>
        <textarea id="goal" className="goal-input" value={goal} onChange={(event) => setGoal(event.target.value)} />
      </section>

      <section className="setup-section code-section">
        <div className="input-label-row">
          <label className="form-label" htmlFor="code">Robot code</label>
          <span>LOCAL SIMULATION</span>
        </div>
        <textarea id="code" spellCheck={false} className="code-input" value={code} onChange={(event) => setCode(event.target.value)} />
      </section>

      <section className="setup-section robot-configurator">
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
      </section>

      <section className="setup-section field-configurator">
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
      </section>

      <div className="input-actions">
        <button className="button run-button" onClick={onRun} disabled={running}>
          <span>{running ? "■" : "▶"}</span>
          {running ? "Simulation running..." : "Run simulation"}
        </button>
        {running && (
          <button className="button analyze-button" type="button" onClick={onStop}>
            <span>■</span>
            Stop simulation
          </button>
        )}
        <button className="button analyze-button" disabled={!canAnalyze || running} onClick={onAnalyze}>
          <span>*</span>
          Feedback placeholder
        </button>
        {setupWarning && <p className="action-warning">{setupWarning}</p>}
        {!canAnalyze && !running && <p className="action-hint">Run the simulation to unlock the feedback placeholder.</p>}
      </div>
    </aside>
  );
}
