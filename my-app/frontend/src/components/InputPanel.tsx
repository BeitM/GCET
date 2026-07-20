import { useEffect, useState } from "react";
import { robotPresets, RobotPresetId } from "@/lib/robots";
import { ArtifactRowId, CoordinateSystem } from "@/lib/types";
import { useTranslation } from "@/hooks/useTranslation";

const artifactRowOptions: { id: ArtifactRowId; labelKey: string }[] = [
  { id: "topLoading", labelKey: "blueLoadingZone" },
  { id: "topRight", labelKey: "blueOne" },
  { id: "topCenter", labelKey: "blueTwo" },
  { id: "topLeft", labelKey: "blueThree" },
  { id: "bottomLoading", labelKey: "redLoadingZone" },
  { id: "bottomRight", labelKey: "redOne" },
  { id: "bottomCenter", labelKey: "redTwo" },
  { id: "bottomLeft", labelKey: "redThree" },
];

type InputPanelProps = {
  experienceLevel: "beginner" | "intermediate" | "advanced";
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
    // Keep the editable draft aligned when another control changes the pose.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  experienceLevel,
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
  const { t } = useTranslation();
  const selectedRobot = robotPresets.find((robot) => robot.id === robotId);
  const [showArtifactRows, setShowArtifactRows] = useState(false);
  const coordinateBounds = coordinateSystem === "center"
    ? { min: -72, max: 72, detail: t("centerOrigin") }
    : { min: 0, max: 144, detail: t("cornerOrigin") };

  return (
    <aside className="input-panel panel">
      <div className="panel-head input-panel-head">
        <div>
          <h2>{experienceLevel === "beginner" ? t("firstMissionTitle") : t("simulationSetup")}</h2>
          <p>{experienceLevel === "beginner" ? t("firstMissionDescription") : t("simulationSetupDescription")}</p>
        </div>
      </div>

      {experienceLevel === "beginner" && <div className="beginner-tip"><b>{t("newHere")}</b><span>{t("codeIsInstructions")}</span></div>}

      <section className="setup-section goal-section">
        <label className="form-label" htmlFor="goal">{t("robotGoal")}</label>
        <textarea id="goal" className="goal-input" value={goal} onChange={(event) => setGoal(event.target.value)} />
      </section>

      <section className="setup-section code-section">
        <div className="input-label-row">
          <label className="form-label" htmlFor="code">{t("robotCode")}</label>
          <span>{t("localSimulation")}</span>
        </div>
        <textarea id="code" spellCheck={false} className="code-input" value={code} onChange={(event) => setCode(event.target.value)} />
      </section>

      {experienceLevel !== "beginner" && <section className="setup-section robot-configurator">
        <div className="config-title">
          <div>
            <label className="form-label">{t("robotPreset")}</label>
            <p>{t("selectStartingConfiguration")}</p>
          </div>
        </div>
        <div className="select-wrap robot-select">
          <select value={robotId} onChange={(event) => onRobot(event.target.value as RobotPresetId)}>
            {robotPresets.map((robot) => (
              <option key={robot.id} value={robot.id}>{robot.id === "turret" ? t("turretShooter") : robot.name}</option>
            ))}
          </select>
          <span>v</span>
        </div>
        <div className={`preset-summary ${selectedRobot?.accent}`}>
          <i />
          <span>{selectedRobot?.id === "turret" ? t("turretDescription") : selectedRobot?.description}</span>
        </div>
        <button type="button" className="cad-button" disabled><span>+</span> {t("importCad")} <small>{t("comingLater")}</small></button>
      </section>}

      {experienceLevel === "advanced" && <section className="setup-section field-configurator">
        <div className="config-title">
          <div>
            <label className="form-label">{t("fieldConfiguration")}</label>
          </div>
        </div>
        <div className="field-config-subtitle">{t("startPosition")}</div>
        <div className="dimension-controls start-pose-controls">
          <label>
            <span>X</span>
            <NumberDraftInput ariaLabel={t("startXAria")} min={coordinateBounds.min} max={coordinateBounds.max} value={startX} unit="in" onCommit={setStartX} />
          </label>
          <label>
            <span>Y</span>
            <NumberDraftInput ariaLabel={t("startYAria")} min={coordinateBounds.min} max={coordinateBounds.max} value={startY} unit="in" onCommit={setStartY} />
          </label>
          <label>
            <span>{t("heading")}</span>
            <NumberDraftInput ariaLabel={t("startHeadingAria")} min={0} max={360} value={startHeading} unit="deg" onCommit={setStartHeading} />
          </label>
        </div>
        <p className="dimension-note"><span>{coordinateBounds.detail}</span> {t("coordinatesShownInInches")}</p>

        <div className="field-config-subtitle">{t("coordinateSystem")}</div>
        <div className="select-wrap coordinate-system-select">
          <select value={coordinateSystem} onChange={(event) => setCoordinateSystem(event.target.value as CoordinateSystem)}>
            <option value="corner">{t("cornerOriginOption")}</option>
            <option value="center">{t("centerOriginOption")}</option>
          </select>
          <span>v</span>
        </div>
        <div className="field-config-subtitle">{t("addPreload")}</div>
        <div className="preload-control">
          <span>{t("artifactsInRobot")}</span>
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
        <div className="field-config-subtitle artifact-subtitle">{t("artifactRows")} <b>{selectedArtifactRows.length}/{artifactRowOptions.length}</b></div>
        <button type="button" className="artifact-row-toggle" onClick={() => setShowArtifactRows((open) => !open)}>
          <span>{showArtifactRows ? t("hideRowSelector") : t("configureArtifactRows")}</span>
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
                <span>{t(option.labelKey)}</span>
              </label>
            ))}
          </div>
        )}
      </section>}

      <div className="input-actions">
        <button className="button run-button" onClick={onRun} disabled={running}>
          <span>{running ? "■" : "▶"}</span>
          {running ? t("robotMoving") : experienceLevel === "beginner" ? t("runFirstMission") : t("runSimulation")}
        </button>
        {running && (
          <button className="button analyze-button" type="button" onClick={onStop}>
            <span>■</span>
            {t("stopSimulation")}
          </button>
        )}
        <button className="button analyze-button" disabled={!canAnalyze || running || analyzing} onClick={onAnalyze}>
          <span>*</span>
          {analyzing ? t("analyzingRun") : experienceLevel === "beginner" ? t("askCoachWhatHappened") : t("getAiFeedback")}
        </button>
        {setupWarning && <p className="action-warning">{setupWarning}</p>}
        {!canAnalyze && !running && <p className="action-hint">{t("runToUnlockAi")}</p>}
      </div>
    </aside>
  );
}
