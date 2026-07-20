import { FieldScene3D } from "@/components/FieldScene3D";
import { fieldSeasons } from "@/lib/seasons";
import { ArtifactRowId, CoordinateSystem, ShotPhysicsState, TelemetryFrame } from "@/lib/types";
import { RobotPresetId } from "@/lib/robots";
import { useTranslation } from "@/hooks/useTranslation";

type FieldSimulatorProps = {
  frame: TelemetryFrame;
  trail: TelemetryFrame[];
  running: boolean;
  robotWidth: number;
  robotLength: number;
  robotId: RobotPresetId;
  coordinateSystem: CoordinateSystem;
  selectedArtifactRows: ArtifactRowId[];
  recordingPhysics: boolean;
  shootSignal?: number;
  ballResetSignal: number;
  showPlayback: boolean;
  frameIndex: number;
  totalFrames: number;
  duration: number;
  onPhysicsArtifacts: (frameIndex: number, artifacts: NonNullable<TelemetryFrame["artifacts"]>) => void;
  onPhysicsShots: (frameIndex: number, shots: ShotPhysicsState[]) => void;
  onSeek: (index: number) => void;
  onTogglePlayback: () => void;
};

export function FieldSimulator({
  frame,
  trail,
  running,
  robotWidth,
  robotLength,
  robotId,
  coordinateSystem,
  selectedArtifactRows,
  recordingPhysics,
  shootSignal,
  ballResetSignal,
  showPlayback,
  frameIndex,
  totalFrames,
  duration,
  onPhysicsArtifacts,
  onPhysicsShots,
  onSeek,
  onTogglePlayback,
}: FieldSimulatorProps) {
  const { t } = useTranslation();
  return (
    <section className="field-card panel clean-field-card">
      <div className="tool-panel-head">
        <div>
          <h2>{t("decodeField")}</h2>
          <p>{t("season3d")}</p>
        </div>
        <div className="field-head-actions">
          <div className="compact-seasons">
            {fieldSeasons.map((season) => (
              <span key={season.id} className={season.status}>
                {season.name}
                {season.status === "coming-soon" && <small>{t("comingSoon")}</small>}
              </span>
            ))}
          </div>
          <div className={`run-state ${running ? "active" : ""}`}>
            <i />
            {running ? t("running") : t("ready")}
          </div>
        </div>
      </div>

      <div className="field-wrap decode-field-wrap">
        <FieldScene3D
          frame={frame}
          trail={trail}
          robotWidth={robotWidth}
          robotLength={robotLength}
          robotId={robotId}
          coordinateSystem={coordinateSystem}
          selectedArtifactRows={selectedArtifactRows}
          running={running}
          recordingPhysics={recordingPhysics}
          shootSignal={shootSignal}
          ballResetSignal={ballResetSignal}
          frameIndex={frameIndex}
          onPhysicsArtifacts={onPhysicsArtifacts}
          onPhysicsShots={onPhysicsShots}
        />
        {showPlayback && (
          <div className="simulation-playback">
            <button
              type="button"
              className={running ? "is-playing" : ""}
              onClick={onTogglePlayback}
              aria-label={running ? t("pauseSimulation") : t("playSimulation")}
            >
              {running ? "Ⅱ" : "▶"}
              <span>{running ? t("pause") : t("play")}</span>
            </button>
            <input
              aria-label={t("simulationTimeline")}
              type="range"
              min="0"
              max={totalFrames - 1}
              value={frameIndex}
              onChange={(event) => onSeek(Number(event.target.value))}
            />
            <time>{frame.time.toFixed(1)} / {duration.toFixed(1)} s</time>
          </div>
        )}
      </div>
    </section>
  );
}
