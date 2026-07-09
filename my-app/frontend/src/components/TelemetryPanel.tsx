import { useMemo, useState } from "react";
import { CoordinateSystem, TelemetryFrame } from "@/lib/types";

type TelemetryItemId = "position" | "heading" | "drivePower" | "encoders" | "progress" | "launcher" | "arm" | "intake" | "events";

type TelemetryOption = {
  id: TelemetryItemId;
  label: string;
  description: string;
};

const telemetryOptions: TelemetryOption[] = [
  { id: "position", label: "Position", description: "X / Y field coordinates" },
  { id: "heading", label: "Heading", description: "Field-relative robot angle" },
  { id: "drivePower", label: "Drive power", description: "Left and right command output" },
  { id: "encoders", label: "Encoders", description: "Left and right drivetrain ticks" },
  { id: "progress", label: "Run progress", description: "Simulation completion percentage" },
  { id: "launcher", label: "Launcher", description: "Shooter RPM and target" },
  { id: "arm", label: "Arm", description: "Arm position and target" },
  { id: "intake", label: "Intake", description: "Roller direction state" },
  { id: "events", label: "Events", description: "Warnings and run markers" },
];

function Metric({
  label,
  value,
  detail,
  accent,
  onRemove,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: string;
  onRemove: () => void;
}) {
  return (
    <div className="metric telemetry-item">
      <button type="button" className="telemetry-remove" aria-label={`Remove ${label} telemetry`} onClick={onRemove}>x</button>
      <span>{label}</span>
      <strong className={accent}>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function EventsSection({ events, onRemove }: { events: TelemetryFrame[]; onRemove: () => void }) {
  return (
    <div className="event-section telemetry-item telemetry-events">
      <button type="button" className="telemetry-remove" aria-label="Remove events telemetry" onClick={onRemove}>x</button>
      <div className="event-title"><span>Events</span><b>{events.length}</b></div>
      <div className="event-log">
        {events.length ? events.slice(-4).reverse().map((event, index) => (
          <div key={`${event.time}-${index}`} className={event.warning ? "warning-event" : "normal-event"}>
            <time>{event.time.toFixed(2)}s</time>
            <i>{event.warning ? "!" : "*"}</i>
            <span>{event.warning || event.event}</span>
          </div>
        )) : <div className="empty-event">Events will appear during the simulation.</div>}
      </div>
    </div>
  );
}

function displayPosition(frame: TelemetryFrame, coordinateSystem: CoordinateSystem) {
  if (coordinateSystem === "center") {
    return {
      x: frame.x - 72,
      y: 72 - frame.y,
      detail: "Center-origin X / Y inches",
    };
  }

  return {
    x: frame.x,
    y: 144 - frame.y,
    detail: "Corner-origin X / Y inches",
  };
}

export function TelemetryPanel({ frame, events, progress, coordinateSystem }: { frame: TelemetryFrame; events: TelemetryFrame[]; progress: number; coordinateSystem: CoordinateSystem }) {
  const [selectedTelemetry, setSelectedTelemetry] = useState<TelemetryItemId[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const position = displayPosition(frame, coordinateSystem);

  const availableTelemetry = useMemo(
    () => telemetryOptions.filter((option) => !selectedTelemetry.includes(option.id)),
    [selectedTelemetry],
  );

  const removeTelemetry = (id: TelemetryItemId) => {
    setSelectedTelemetry((current) => current.filter((item) => item !== id));
  };

  const addTelemetry = (id: TelemetryItemId) => {
    setSelectedTelemetry((current) => [...current, id]);
    setShowAddMenu(false);
  };

  const renderTelemetry = (id: TelemetryItemId) => {
    if (id === "events") return <EventsSection key={id} events={events} onRemove={() => removeTelemetry(id)} />;

    const props = {
      position: {
        label: "Position",
        value: `${position.x.toFixed(1)}, ${position.y.toFixed(1)}`,
        detail: position.detail,
      },
      heading: {
        label: "Heading",
        value: `${frame.heading.toFixed(1)} deg`,
        detail: "Field relative",
        accent: Math.abs(frame.heading) > 8 ? "warn" : "",
      },
      drivePower: {
        label: "Drive power",
        value: `${frame.leftPower.toFixed(2)} / ${frame.rightPower.toFixed(2)}`,
        detail: "Left / right",
      },
      encoders: {
        label: "Encoders",
        value: `${Math.round(frame.leftEncoder)} / ${Math.round(frame.rightEncoder)}`,
        detail: "Left / right ticks",
      },
      progress: {
        label: "Run progress",
        value: `${Math.round(progress)}%`,
        detail: "Simulation completion",
      },
      launcher: {
        label: "Launcher",
        value: frame.shooterTarget > 0 ? `${Math.round(frame.shooterRpm).toLocaleString()} RPM` : "Idle",
        detail: frame.shooterTarget > 0 ? `Target ${frame.shooterTarget.toLocaleString()} RPM` : "No target set",
        accent: frame.feeder && frame.shooterRpm < frame.shooterTarget * 0.95 ? "warn" : "",
      },
      arm: {
        label: "Arm",
        value: frame.armTarget > 0 ? `${Math.round(frame.armPosition).toLocaleString()} ticks` : "Idle",
        detail: frame.armTarget > 0 ? `Target ${frame.armTarget.toLocaleString()} ticks` : "No target set",
        accent: frame.armPosition > 1400 ? "warn" : "",
      },
      intake: {
        label: "Intake",
        value: frame.intake === "in" ? "Collecting" : frame.intake === "out" ? "Reversed" : "Off",
        detail: "Roller direction",
        accent: frame.intake === "out" ? "warn" : "",
      },
    }[id];

    return <Metric key={id} {...props} onRemove={() => removeTelemetry(id)} />;
  };

  return (
    <section className="telemetry panel clean-telemetry">
      <div className="tool-panel-head"><div><h2>Telemetry</h2><p>Live robot data</p></div><span className="timecode">{frame.time.toFixed(2)} s</span></div>
      <div className="timeline"><span style={{ width: `${progress}%` }} /><i style={{ left: `${progress}%` }} /></div>
      <div className="telemetry-section-stack">
        {selectedTelemetry.map(renderTelemetry)}
        <div className="telemetry-add">
          <button type="button" className="telemetry-add-button" onClick={() => setShowAddMenu((open) => !open)}>
            + Add telemetry
          </button>
          {showAddMenu && (
            <div className="telemetry-add-menu">
              {availableTelemetry.length ? availableTelemetry.map((option) => (
                <button key={option.id} type="button" onClick={() => addTelemetry(option.id)}>
                  <span>{option.label}</span>
                  <small>{option.description}</small>
                </button>
              )) : <p>All telemetry sections are visible.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
