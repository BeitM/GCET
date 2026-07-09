import { robotPresets, RobotPresetId } from "@/lib/robots";

type InputPanelProps = {
  goal: string;
  setGoal: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  onRun: () => void;
  running: boolean;
  onAnalyze: () => void;
  canAnalyze: boolean;
  robotId: RobotPresetId;
  onRobot: (id: RobotPresetId) => void;
  robotWidth: number;
  robotLength: number;
  setRobotWidth: (value: number) => void;
  setRobotLength: (value: number) => void;
};

export function InputPanel({
  goal,
  setGoal,
  code,
  setCode,
  onRun,
  running,
  onAnalyze,
  canAnalyze,
  robotId,
  onRobot,
  robotWidth,
  robotLength,
  setRobotWidth,
  setRobotLength,
}: InputPanelProps) {
  const selectedRobot = robotPresets.find((robot) => robot.id === robotId);

  return (
    <aside className="input-panel panel">
      <div className="panel-head input-panel-head">
        <div>
          <h2>Sandbox setup</h2>
          <p>Configure the routine and virtual robot.</p>
        </div>
      </div>

      <section className="setup-section goal-section">
        <label className="form-label" htmlFor="goal">Robot goal</label>
        <textarea id="goal" className="goal-input" value={goal} onChange={(event) => setGoal(event.target.value)} />
      </section>

      <section className="setup-section code-section">
        <div className="input-label-row">
          <label className="form-label" htmlFor="code">Routine code</label>
          <span>SANDBOX COMMANDS</span>
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
              <option key={robot.id} value={robot.id}>{robot.name} - {robot.width} x {robot.length} in</option>
            ))}
          </select>
          <span>v</span>
        </div>
        <div className={`preset-summary ${selectedRobot?.accent}`}>
          <i />
          <span>{selectedRobot?.description}</span>
        </div>
        <div className="dimension-controls">
          <label>
            <span>Width</span>
            <div>
              <input aria-label="Robot width" type="number" min="8" max="18" step="0.5" value={robotWidth} onChange={(event) => setRobotWidth(Math.min(18, Math.max(8, Number(event.target.value))))} />
              <b>in</b>
            </div>
          </label>
          <label>
            <span>Length</span>
            <div>
              <input aria-label="Robot length" type="number" min="8" max="18" step="0.5" value={robotLength} onChange={(event) => setRobotLength(Math.min(18, Math.max(8, Number(event.target.value))))} />
              <b>in</b>
            </div>
          </label>
        </div>
        <button type="button" className="cad-button" disabled><span>+</span> Import CAD <small>Coming later</small></button>
      </section>

      <div className="input-actions">
        <button className="button run-button" onClick={onRun} disabled={running}>
          <span>{running ? "■" : "▶"}</span>
          {running ? "Simulation running..." : "Run sandbox"}
        </button>
        <button className="button analyze-button" disabled={!canAnalyze || running} onClick={onAnalyze}>
          <span>*</span>
          Feedback placeholder
        </button>
        {!canAnalyze && !running && <p className="action-hint">Run the sandbox to unlock the feedback placeholder.</p>}
      </div>
    </aside>
  );
}
