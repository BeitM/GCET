"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AIFeedback, TelemetryFrame } from "@/lib/types";
import { AIFeedbackPanel } from "@/components/AIFeedbackPanel";
import { FieldSimulator } from "@/components/FieldSimulator";
import { InputPanel } from "@/components/InputPanel";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { robotPresets, RobotPresetId } from "@/lib/robots";

type RoutineAction = "move_left" | "move_right" | "move_forward" | "move_backward" | "shoot";

const defaultGoal = "Test a sandbox routine on the DECODE field.";
const defaultCode = `move_forward();
move_left();
shoot();`;

const baseFrame: TelemetryFrame = {
  x: 20,
  y: 122,
  heading: 0,
  leftPower: 0,
  rightPower: 0,
  leftEncoder: 0,
  rightEncoder: 0,
  shooterTarget: 0,
  shooterRpm: 0,
  feeder: false,
  armTarget: 0,
  armPosition: 0,
  intake: "off",
  claw: "closed",
  time: 0,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function parseRoutine(source: string): RoutineAction[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/[;\n]/)
    .map((line) => line.replace(/\/\/.*$/g, "").trim().toLowerCase().replace(/\s/g, ""))
    .map((token) => {
      if (token === "move_left()") return "move_left";
      if (token === "move_right()") return "move_right";
      if (token === "move_forward()" || token === "move_up()") return "move_forward";
      if (token === "move_backward()" || token === "move_down()") return "move_backward";
      if (token === "shoot()") return "shoot";
      return null;
    })
    .filter(Boolean) as RoutineAction[];
}

function generateRoutineFrames(source: string): TelemetryFrame[] {
  const actions = parseRoutine(source);
  const frames: TelemetryFrame[] = [{ ...baseFrame, event: "Ready" }];
  let current = { x: baseFrame.x, y: baseFrame.y, heading: baseFrame.heading };
  let time = 0;
  let leftEncoder = 0;
  let rightEncoder = 0;

  if (actions.length === 0) {
    return [
      ...frames,
      {
        ...baseFrame,
        time: 0.1,
        warning: "No supported sandbox commands parsed",
      },
    ];
  }

  for (const action of actions) {
    if (action === "shoot") {
      for (let i = 1; i <= 8; i++) {
        time += 0.1;
        frames.push({
          ...baseFrame,
          ...current,
          time,
          shooterTarget: 3600,
          shooterRpm: 3600,
          feeder: i === 1,
          event: i === 1 ? "Shoot" : "",
        });
      }
      continue;
    }

    const start = { ...current };
    const target = { ...current };
    const delta = 16;

    if (action === "move_left") target.x -= delta;
    if (action === "move_right") target.x += delta;
    if (action === "move_forward") target.y -= delta;
    if (action === "move_backward") target.y += delta;

    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      time += 0.1;
      leftEncoder += 42;
      rightEncoder += 42;
      frames.push({
        ...baseFrame,
        x: lerp(start.x, target.x, t),
        y: lerp(start.y, target.y, t),
        heading: current.heading,
        leftPower: 0.45,
        rightPower: 0.45,
        leftEncoder,
        rightEncoder,
        time,
        event: i === 1 ? action : "",
      });
    }

    current = target;
  }

  return frames;
}

const placeholderFeedback: AIFeedback = {
  headline: "AI feedback placeholder",
  status: "complete",
  happened: "The sandbox routine ran and produced telemetry, but AI analysis is not connected yet.",
  cause: "This button is reserved for the future analysis pipeline that will compare robot intent, code, and telemetry.",
  evidence: ["Telemetry frames were generated locally", "No external AI model was called", "Sandbox command parsing is active"],
  fix: "Keep using the run controls to validate sandbox movement while the feedback integration is built.",
  optimization: "Future versions can replace this placeholder with model-generated debugging guidance.",
  concept: "The simulator and analysis layers are intentionally separate so sandbox behavior can mature before AI feedback is wired in.",
};

export default function SimulatorDashboard() {
  const [goal, setGoal] = useState(defaultGoal);
  const [code, setCode] = useState(defaultCode);
  const [robotId, setRobotId] = useState<RobotPresetId>("turret");
  const [robotWidth, setRobotWidth] = useState(17);
  const [robotLength, setRobotLength] = useState(17);
  const [frames, setFrames] = useState<TelemetryFrame[]>(() => generateRoutineFrames(defaultCode));
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [runId, setRunId] = useState(0);
  const [analysis, setAnalysis] = useState<AIFeedback | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const frame = frames[index] || frames[0];
  const events = frames.slice(0, index + 1).filter((item) => item.event || item.warning);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const selectRobot = (id: RobotPresetId) => {
    const robot = robotPresets.find((item) => item.id === id)!;
    setRobotId(id);
    setRobotWidth(robot.width);
    setRobotLength(robot.length);
  };

  const stopPlayback = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };

  const playFrames = (frameList: TelemetryFrame[], startIndex: number) => {
    if (timer.current) clearInterval(timer.current);
    const lastIndex = frameList.length - 1;
    let i = Math.min(startIndex, lastIndex);

    setFrames(frameList);
    setIndex(i);
    setRunning(true);
    timer.current = setInterval(() => {
      i++;
      setIndex(i);
      if (i >= lastIndex) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setRunning(false);
        setHasRun(true);
      }
    }, 90);
  };

  const playFrom = (startIndex: number) => playFrames(frames, startIndex);

  const run = () => {
    setRunId((id) => id + 1);
    setAnalysis(null);
    setHasRun(false);
    playFrames(generateRoutineFrames(code), 0);
  };

  const togglePlayback = () => {
    if (running) {
      stopPlayback();
      return;
    }
    playFrom(index >= frames.length - 1 ? 0 : index);
  };

  const seek = (nextIndex: number) => {
    stopPlayback();
    setIndex(nextIndex);
  };

  const showFeedbackPlaceholder = () => {
    setAnalysis(placeholderFeedback);
    setTimeout(() => document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const shootSignal = frame.event === "Shoot" ? runId * 10000 + index : -1;

  return (
    <main className="sim-shell">
      <header className="sim-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="sim-title"><span>SANDBOX</span><i />{robotPresets.find((robot) => robot.id === robotId)?.name}</div>
        <div className="sim-nav-right"><span><i className="live-dot" />SANDBOX READY</span><Link href="/">Exit lab x</Link></div>
      </header>
      <div className="sim-layout">
        <InputPanel
          {...{ goal, setGoal, code, setCode, running, robotId, robotWidth, robotLength, setRobotWidth, setRobotLength }}
          onRobot={selectRobot}
          onRun={run}
          onAnalyze={showFeedbackPlaceholder}
          canAnalyze={hasRun}
        />
        <div className="workspace">
          <div className="field-row">
            <FieldSimulator
              frame={frame}
              trail={frames.slice(0, index + 1)}
              running={running}
              robotId={robotId}
              robotWidth={robotWidth}
              robotLength={robotLength}
              shootSignal={shootSignal}
              showPlayback={hasRun}
              frameIndex={index}
              totalFrames={frames.length}
              duration={frames.at(-1)?.time || 0}
              onSeek={seek}
              onTogglePlayback={togglePlayback}
            />
            <TelemetryPanel frame={frame} events={events} progress={(index / Math.max(1, frames.length - 1)) * 100} />
          </div>
          {(hasRun || analysis) && (
            <div id="analysis">
              <AIFeedbackPanel data={analysis} goal={goal} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
