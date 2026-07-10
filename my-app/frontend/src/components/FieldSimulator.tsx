import { FieldScene3D } from "@/components/FieldScene3D";
import { fieldSeasons } from "@/lib/seasons";
import { ArtifactRowId, CoordinateSystem, ShotPhysicsState, TelemetryFrame } from "@/lib/types";
import { RobotPresetId } from "@/lib/robots";
import { GamepadSnapshot, VIRTUAL_GAMEPAD_INDEX } from "@/lib/teleop";

type FieldSimulatorProps = {
  frame: TelemetryFrame;
  trail: TelemetryFrame[];
  running: boolean;
  robotWidth: number;
  robotLength: number;
  robotId: RobotPresetId;
  coordinateSystem: CoordinateSystem;
  selectedArtifactRows: ArtifactRowId[];
  liveArtifacts?: NonNullable<TelemetryFrame["artifacts"]>;
  recordingPhysics: boolean;
  teleopActive: boolean;
  gamepadInfo: GamepadSnapshot | null;
  onToggleTeleop: () => void;
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
  liveArtifacts,
  recordingPhysics,
  teleopActive,
  gamepadInfo,
  onToggleTeleop,
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
  return (
    <section className="field-card panel clean-field-card">
      <div className="tool-panel-head">
        <div>
          <h2>DECODE field</h2>
          <p>2025–2026 season · Interactive 3D view</p>
        </div>
        <div className="field-head-actions">
          <div className="compact-seasons">
            {fieldSeasons.map((season) => (
              <span key={season.id} className={season.status}>
                {season.name}
                {season.status === "coming-soon" && <small>Coming soon</small>}
              </span>
            ))}
          </div>
          <div className="mode-control">
            <span className="mode-control-label">MODE</span>
            <div className={`mode-slider ${teleopActive ? "teleop" : "auto"}`} role="group" aria-label="Control mode">
              <button
                type="button"
                className={`mode-slider-option ${!teleopActive ? "selected" : ""}`}
                onClick={() => {
                  if (teleopActive) onToggleTeleop();
                }}
                aria-pressed={!teleopActive}
              >
                AUTO
              </button>
              <button
                type="button"
                className={`mode-slider-option ${teleopActive ? "selected" : ""}`}
                onClick={() => {
                  if (!teleopActive) onToggleTeleop();
                }}
                aria-pressed={teleopActive}
              >
                TELEOP
              </button>
              <span className="mode-slider-thumb" aria-hidden="true" />
            </div>
          </div>
          <div className={`gamepad-state ${gamepadInfo ? "connected" : ""} ${gamepadInfo?.index === VIRTUAL_GAMEPAD_INDEX ? "virtual" : ""}`} title={gamepadInfo?.id || "Connect a gamepad before enabling TELEOP"}>
            <i />
            {gamepadInfo?.index === VIRTUAL_GAMEPAD_INDEX ? "Virtual mouse" : gamepadInfo ? `Gamepad ${gamepadInfo.index + 1}` : "No gamepad"}
          </div>
          <div className={`run-state ${running ? "active" : ""}`}>
            <i />
            {running ? "Running" : "Ready"}
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
          liveArtifacts={liveArtifacts}
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
              aria-label={running ? "Pause simulation" : "Play simulation"}
            >
              {running ? "Ⅱ" : "▶"}
              <span>{running ? "Pause" : "Play"}</span>
            </button>
            <input
              aria-label="Simulation timeline"
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
