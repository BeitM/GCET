import { FieldScene3D } from "@/components/FieldScene3D";
import { fieldSeasons } from "@/lib/seasons";
import { TelemetryFrame } from "@/lib/types";
import { RobotPresetId } from "@/lib/robots";

type FieldSimulatorProps = {
  frame: TelemetryFrame;
  trail: TelemetryFrame[];
  running: boolean;
  robotWidth: number;
  robotLength: number;
  robotId: RobotPresetId;
  shootSignal?: number;
  showPlayback: boolean;
  frameIndex: number;
  totalFrames: number;
  duration: number;
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
  shootSignal,
  showPlayback,
  frameIndex,
  totalFrames,
  duration,
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
          running={running}
          shootSignal={shootSignal}
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
