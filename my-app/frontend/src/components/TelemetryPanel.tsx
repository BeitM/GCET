import { useState } from "react";
import { CoordinateSystem, TelemetryFrame } from "@/lib/types";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationValues } from "@/lib/translations";

type TelemetryItemId = "position" | "heading" | "drivePower" | "encoders" | "progress" | "launcher" | "arm" | "intake" | "events";

type TelemetryOption = {
  id: TelemetryItemId;
  label: string;
  description: string;
};

type Translate = (key: string, values?: TranslationValues) => string;

function Metric({
  label,
  value,
  detail,
  accent,
  onRemove,
  removeLabel,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: string;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="metric telemetry-item">
      <button type="button" className="telemetry-remove" aria-label={removeLabel} onClick={onRemove}>x</button>
      <span>{label}</span>
      <strong className={accent}>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function translateTelemetryEvent(message: string | undefined, t: Translate): string {
  if (!message) return "";
  const exact: Record<string, string> = {
    Ready: t("eventReady"),
    "Objects settled": t("eventObjectsSettled"),
    "No supported robot code actions parsed": t("eventUnsupportedCode"),
    "No artifact loaded to shoot": t("eventNoArtifact"),
    "Invalid start position": t("eventInvalidStart"),
    "controlled 4 artifacts": t("eventControlledArtifacts"),
  };
  if (exact[message]) return exact[message];
  return message
    .replace(/collected artifact (\d+)/, (_, count: string) => t("eventCollectedArtifact", { count }))
    .replace("controlled 4 artifacts", t("eventControlledArtifacts"));
}

function EventsSection({ events, onRemove, t }: { events: TelemetryFrame[]; onRemove: () => void; t: Translate }) {
  return (
    <div className="event-section telemetry-item telemetry-events">
      <button type="button" className="telemetry-remove" aria-label={t("removeEventsTelemetry")} onClick={onRemove}>x</button>
      <div className="event-title"><span>{t("events")}</span><b>{events.length}</b></div>
      <div className="event-log">
        {events.length ? events.slice(-4).reverse().map((event, index) => (
          <div key={`${event.time}-${index}`} className={event.warning ? "warning-event" : "normal-event"}>
            <time>{event.time.toFixed(2)}s</time>
            <i>{event.warning ? "!" : "*"}</i>
            <span>{translateTelemetryEvent(event.warning || event.event, t)}</span>
          </div>
        )) : <div className="empty-event">{t("eventsAppear")}</div>}
      </div>
    </div>
  );
}

function displayPosition(frame: TelemetryFrame, coordinateSystem: CoordinateSystem, t: Translate) {
  if (coordinateSystem === "center") {
    return {
      x: frame.x - 72,
      y: 72 - frame.y,
      detail: t("centerOriginDetail"),
    };
  }

  return {
    x: frame.x,
    y: 144 - frame.y,
    detail: t("cornerOriginDetail"),
  };
}

export function TelemetryPanel({ frame, events, progress, coordinateSystem }: { frame: TelemetryFrame; events: TelemetryFrame[]; progress: number; coordinateSystem: CoordinateSystem }) {
  const { t, language } = useTranslation();
  const [selectedTelemetry, setSelectedTelemetry] = useState<TelemetryItemId[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const position = displayPosition(frame, coordinateSystem, t);
  const telemetryOptions: TelemetryOption[] = [
    { id: "position", label: t("position"), description: t("positionDescription") },
    { id: "heading", label: t("heading"), description: t("headingDescription") },
    { id: "drivePower", label: t("drivePower"), description: t("drivePowerDescription") },
    { id: "encoders", label: t("encoders"), description: t("encodersDescription") },
    { id: "progress", label: t("runProgress"), description: t("runProgressDescription") },
    { id: "launcher", label: t("launcher"), description: t("launcherDescription") },
    { id: "arm", label: t("arm"), description: t("armDescription") },
    { id: "intake", label: t("intake"), description: t("intakeDescription") },
    { id: "events", label: t("events"), description: t("eventsDescription") },
  ];

  const availableTelemetry = telemetryOptions.filter((option) => !selectedTelemetry.includes(option.id));

  const removeTelemetry = (id: TelemetryItemId) => {
    setSelectedTelemetry((current) => current.filter((item) => item !== id));
  };

  const addTelemetry = (id: TelemetryItemId) => {
    setSelectedTelemetry((current) => [...current, id]);
    setShowAddMenu(false);
  };

  const renderTelemetry = (id: TelemetryItemId) => {
    if (id === "events") return <EventsSection key={id} events={events} onRemove={() => removeTelemetry(id)} t={t} />;

    const props = {
      position: {
        label: t("position"),
        value: `${position.x.toFixed(1)}, ${position.y.toFixed(1)}`,
        detail: position.detail,
      },
      heading: {
        label: t("heading"),
        value: `${frame.heading.toFixed(1)} deg`,
        detail: t("fieldRelative"),
        accent: Math.abs(frame.heading) > 8 ? "warn" : "",
      },
      drivePower: {
        label: t("drivePower"),
        value: `${frame.leftPower.toFixed(2)} / ${frame.rightPower.toFixed(2)}`,
        detail: t("leftRight"),
      },
      encoders: {
        label: t("encoders"),
        value: `${Math.round(frame.leftEncoder)} / ${Math.round(frame.rightEncoder)}`,
        detail: t("leftRightTicks"),
      },
      progress: {
        label: t("runProgress"),
        value: `${Math.round(progress)}%`,
        detail: t("simulationCompletion"),
      },
      launcher: {
        label: t("launcher"),
        value: frame.shooterTarget > 0 ? `${Math.round(frame.shooterRpm).toLocaleString(language)} RPM` : t("idle"),
        detail: frame.shooterTarget > 0 ? t("targetRpm", { target: frame.shooterTarget.toLocaleString(language) }) : t("noTargetSet"),
        accent: frame.feeder && frame.shooterRpm < frame.shooterTarget * 0.95 ? "warn" : "",
      },
      arm: {
        label: t("arm"),
        value: frame.armTarget > 0 ? t("ticks", { value: Math.round(frame.armPosition).toLocaleString(language) }) : t("idle"),
        detail: frame.armTarget > 0 ? t("targetTicks", { target: frame.armTarget.toLocaleString(language) }) : t("noTargetSet"),
        accent: frame.armPosition > 1400 ? "warn" : "",
      },
      intake: {
        label: t("intake"),
        value: frame.intake === "in" ? t("collecting") : frame.intake === "out" ? t("reversed") : t("off"),
        detail: t("artifactsStored", { count: frame.artifactCount }),
        accent: frame.intake === "out" ? "warn" : "",
      },
    }[id];

    return <Metric key={id} {...props} removeLabel={t("removeTelemetry", { label: props.label })} onRemove={() => removeTelemetry(id)} />;
  };

  return (
    <section className="telemetry panel clean-telemetry">
      <div className="tool-panel-head"><div><h2>{t("telemetry")}</h2><p>{t("liveRobotData")}</p></div><span className="timecode">{frame.time.toFixed(2)} s</span></div>
      <div className="timeline"><span style={{ width: `${progress}%` }} /><i style={{ left: `${progress}%` }} /></div>
      <div className="telemetry-section-stack">
        {selectedTelemetry.map(renderTelemetry)}
        <div className="telemetry-add">
          <button type="button" className="telemetry-add-button" onClick={() => setShowAddMenu((open) => !open)}>
            + {t("addTelemetry")}
          </button>
          {showAddMenu && (
            <div className="telemetry-add-menu">
              {availableTelemetry.length ? availableTelemetry.map((option) => (
                <button key={option.id} type="button" onClick={() => addTelemetry(option.id)}>
                  <span>{option.label}</span>
                  <small>{option.description}</small>
                </button>
              )) : <p>{t("allTelemetryVisible")}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
