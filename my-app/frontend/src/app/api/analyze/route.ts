import { NextRequest, NextResponse } from "next/server";
import type { AIChatMessage, AIFeedback, AnalyzeRequest, AnalyzeResponse, DecodeRuleViolation, ScoreBreakdown, ScoreEvent, TelemetryFrame } from "@/lib/types";

export const runtime = "nodejs";

type TelemetrySummary = {
  duration: number;
  frameCount: number;
  autonomousScoringTotal: number;
  teleOpScoringTotal: number;
  score: ScoreBreakdown;
  scoreEvents: Array<ScoreEvent & { time: number }>;
  artifactCount: NonNullable<TelemetryFrame["decodeTelemetry"]>["artifactCount"];
  shotSuccessRate: NonNullable<TelemetryFrame["decodeTelemetry"]>["shotSuccessRate"];
  flywheelEfficiency: NonNullable<TelemetryFrame["decodeTelemetry"]>["flywheelEfficiency"];
  robotVelocity: NonNullable<TelemetryFrame["decodeTelemetry"]>["robotVelocity"];
  ruleViolations: DecodeRuleViolation[];
  warnings: string[];
  notableEvents: string[];
  finalPose: { x: number; y: number; heading: number };
  driveDistance: number;
};

type GoalEvaluation = {
  intendedGoal: string;
  requestedShots: number;
  wantsMovement: boolean;
  wantsPreloadShot: boolean;
  achieved: boolean;
  summary: string;
  observations: string[];
  failures: GoalFailure[];
};

type GoalFailureKind =
  | "not-enough-preload"
  | "no-movement"
  | "not-enough-shots-fired"
  | "wrong-goal"
  | "missed-classifier"
  | "not-enough-scored";

type GoalFailure = {
  kind: GoalFailureKind;
  message: string;
  cause: string;
  action: string;
  nextTest: string;
  optimization: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeContext = {
  appPurpose: "GCET is an FTC DECODE robot-code sandbox. Students test simplified autonomous and TeleOp routines before translating ideas into real FTC SDK code.",
  audience: "FTC students and mentors who want practical debugging, strategy, and programming feedback from a recorded simulation.",
  rulebookReference: "FTC DECODE Competition Manual TU32, summarized into app-specific guidance. Treat live telemetry and recorded score events as the source of truth for this run.",
  fieldLanguage: [
    "ARTIFACT: purple or green game piece handled by the robot, intake, flywheel, and goal.",
    "GOAL: alliance-specific structure with an open top and archway exit connected to the CLASSIFIER.",
    "CLASSIFIER: goal-attached structure with SQUARE, RAMP, and GATE components.",
    "SQUARE: classifier region where the app detects whether a shot passed through for scoring.",
    "OVERFLOW: an artifact that passes the classifier square but is not classified into the ramp slots.",
    "LOADING ZONE: alliance-specific corner area where artifacts can be introduced for robot pickup.",
  ],
  scoringModel: [
    "Use summary.score and summary.scoreEvents as authoritative because they are produced after recorded physics playback.",
    "Correct-alliance classified shot: 3 points in this simulator.",
    "Overflow shot: 1 point when overflow simulation is active.",
    "Wrong-alliance goal: 0 points and should be treated as a strategy/rule-risk event.",
    "Do not infer a scored shot from a shoot command alone; only classifier crossing events count.",
  ],
  robotModel: [
    "driveForward(value), driveBack(value), driveLeft(value), driveRight(value): move by inches.",
    "driveToPosition(x, y): drive to a coordinate while holding heading.",
    "driveToPosition(x, y, heading): drive to a coordinate while gradually turning to that heading.",
    "turn(value): turn in place to an absolute heading.",
    "spinFlywheel(value): ramp the shooter flywheel to target RPM.",
    "shoot(value): fire one stored artifact from the front of the robot at a clamped launch angle.",
    "intakeSpinIn(): collect artifacts on front-intake contact up to 3 stored artifacts.",
    "intakeSpinOut(): release stored artifacts.",
    "wait(value): wait seconds for flywheel spin-up, object settling, or timing.",
  ],
  strategyPriorities: [
    "Prioritize reliable own-goal scoring over risky shots.",
    "Use preload timing and flywheel readiness before recommending path changes.",
    "Keep artifact control at 3 or fewer and call out 4-artifact control risk clearly.",
    "Recommend small concrete code edits, not generic practice advice.",
    "When scoring fails, distinguish no shot, missed classifier, wrong goal, low flywheel readiness, and bad launch timing.",
    "For pathing feedback, mention heading, coordinate system, start pose, and wasted motion when those are supported by telemetry.",
  ],
  responseStyle: [
    "Be concise, mentor-like, and technical.",
    "Lead with what happened in the simulation, then why, then the smallest useful code or strategy change.",
    "Use FTC terms naturally, but do not invent rule violations that are not in telemetry.",
    "If telemetry is missing, say what extra signal would be needed instead of guessing.",
  ],
};

function latestTelemetry(frames: TelemetryFrame[]) {
  return [...frames].reverse().find((frame) => frame.decodeTelemetry)?.decodeTelemetry;
}

function latestScore(frames: TelemetryFrame[]): ScoreBreakdown {
  return [...frames].reverse().find((frame) => frame.score)?.score || {
    shotsMade: 0,
    totalPoints: 0,
    classifiedShots: 0,
    overflowShots: 0,
    wrongGoalShots: 0,
  };
}

function scoreEvents(frames: TelemetryFrame[]) {
  const seen = new Set<string>();
  return frames.flatMap((frame) => {
    if (!frame.scoreEvent) return [];
    const key = `${frame.scoreEvent.shotId}-${frame.scoreEvent.goal}-${frame.scoreEvent.result}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...frame.scoreEvent, time: frame.time }];
  });
}

function attemptedShotCount(frames: TelemetryFrame[], telemetryAttempted: number) {
  const shotIds = new Set<number>();
  frames.forEach((frame) => {
    if (frame.shot) shotIds.add(frame.shot.id);
    frame.shots?.forEach((shot) => shotIds.add(shot.id));
  });
  return Math.max(telemetryAttempted, shotIds.size);
}

function requestedShotCount(goal: string) {
  const lower = goal.toLowerCase();
  const digitMatch = lower.match(/(?:shoot|score|fire|launch)\D{0,24}(\d+)/) || lower.match(/(\d+)\D{0,16}(?:artifact|shot)/);
  if (digitMatch) return Math.max(1, Number(digitMatch[1]));
  if (/\b(one|a|an)\b/.test(lower) && /(?:shoot|score|fire|launch|artifact)/.test(lower)) return 1;
  return /(?:shoot|score|fire|launch)/.test(lower) ? 1 : 0;
}

function buildGoalFailures({
  requestedShots,
  wantsMovement,
  wantsPreloadShot,
  moved,
  preloadAvailable,
  attemptedEnough,
  scoredEnough,
  correctGoal,
  summary,
}: {
  requestedShots: number;
  wantsMovement: boolean;
  wantsPreloadShot: boolean;
  moved: boolean;
  preloadAvailable: boolean;
  attemptedEnough: boolean;
  scoredEnough: boolean;
  correctGoal: boolean;
  summary: TelemetrySummary;
}): GoalFailure[] {
  const failures: GoalFailure[] = [];
  const shotWord = requestedShots === 1 ? "shot" : "shots";

  if (!preloadAvailable) {
    failures.push({
      kind: "not-enough-preload",
      message: `The goal needs ${requestedShots} preloaded ${shotWord}, but the robot started with ${summary.artifactCount.preloaded}.`,
      cause: "The starting preload count does not match the goal, so the robot cannot complete the requested shots without collecting more artifacts.",
      action: `Set Add preload to at least ${requestedShots}, or add an intake pickup before the extra shot.`,
      nextTest: `Run a preload-only test with ${requestedShots} stored artifact${requestedShots === 1 ? "" : "s"} and confirm the telemetry starts with that count.`,
      optimization: "After the preload count is correct, reduce wait/path time only if both shots still score reliably.",
    });
  }

  if (wantsMovement && !moved) {
    failures.push({
      kind: "no-movement",
      message: "The goal asked the robot to move, but the recorded path did not show meaningful movement.",
      cause: "The code did not produce a drive segment before the scoring action, or the target was clamped by the field boundary.",
      action: "Add or fix a drive command before shooting, such as driveToPosition(x, y, heading), then verify the robot pose changes in telemetry.",
      nextTest: "Run only the movement command and confirm the position telemetry changes before adding the shooter commands back.",
      optimization: "Once movement is reliable, shorten the route by reducing unnecessary distance or turns.",
    });
  }

  if (!attemptedEnough) {
    failures.push({
      kind: "not-enough-shots-fired",
      message: `The goal asked for ${requestedShots} ${shotWord}, but only ${summary.shotSuccessRate.attempted} fired.`,
      cause: "The routine ended before enough shoot commands ran, or the robot did not have an artifact available for each requested shot.",
      action: `Add one shoot(angle) command for each intended shot and make sure artifact count is at least ${requestedShots} before those commands run.`,
      nextTest: `Run a shot-count test and confirm telemetry reports ${requestedShots}/${requestedShots} attempted shots before judging accuracy.`,
      optimization: "After the shot count is correct, tune spacing between shots so the flywheel recovers without wasting time.",
    });
  }

  if (!correctGoal) {
    failures.push({
      kind: "wrong-goal",
      message: `${summary.score.wrongGoalShots} shot${summary.score.wrongGoalShots === 1 ? "" : "s"} crossed the wrong-alliance classifier.`,
      cause: "The robot was aimed at, or traveled toward, the opponent goal for the selected alliance color.",
      action: "Check alliance color, target coordinates, and final heading so the shot exits toward the correct alliance goal.",
      nextTest: "Turn on field reference and run a single shot while watching which classifier records the crossing.",
      optimization: "After the heading is correct, store that pose as a repeatable shooting waypoint.",
    });
  }

  if (attemptedEnough && summary.shotSuccessRate.attempted > summary.score.shotsMade) {
    failures.push({
      kind: "missed-classifier",
      message: `${summary.shotSuccessRate.attempted - summary.score.shotsMade} fired shot${summary.shotSuccessRate.attempted - summary.score.shotsMade === 1 ? "" : "s"} did not become classified score events.`,
      cause: "At least one artifact was fired, but the recorded physics did not show it crossing the correct classifier square.",
      action: "Tune the shooting pose, robot heading, shot angle, or flywheel timing before adding more path complexity.",
      nextTest: "Run one isolated shot from the same pose and verify whether the classifier event appears.",
      optimization: "Once the shot crosses reliably, shorten the approach path or combine the shot with a pickup route.",
    });
  }

  if (!scoredEnough && attemptedEnough && summary.score.shotsMade > 0) {
    failures.push({
      kind: "not-enough-scored",
      message: `The robot scored ${summary.score.shotsMade}/${requestedShots} requested shots.`,
      cause: "The routine partially met the goal, but not enough fired artifacts became valid classifier scores.",
      action: "Keep the successful shot path as the baseline, then add or tune one additional shot at a time.",
      nextTest: "Duplicate the successful shot sequence once and verify the second score event before adding new movement.",
      optimization: "After both scores work, reduce cycle time by keeping the flywheel near target between shots.",
    });
  }

  return failures;
}

function evaluateGoal(goal: string, summary: TelemetrySummary): GoalEvaluation {
  const normalizedGoal = goal.trim() || "Improve DECODE performance.";
  const lower = normalizedGoal.toLowerCase();
  const requestedShots = requestedShotCount(normalizedGoal);
  const wantsMovement = /(?:move|drive|closer|approach|go to|driveto)/.test(lower);
  const wantsPreloadShot = /preload|preloaded/.test(lower);
  const moved = summary.driveDistance > 1 || summary.robotVelocity.linearSpeedInchesPerSecond > 0;
  const attemptedEnough = requestedShots === 0 || summary.shotSuccessRate.attempted >= requestedShots;
  const scoredEnough = requestedShots === 0 || summary.score.shotsMade >= requestedShots;
  const preloadAvailable = !wantsPreloadShot || summary.artifactCount.preloaded >= Math.max(1, requestedShots);
  const movementSatisfied = !wantsMovement || moved;
  const correctGoal = summary.score.wrongGoalShots === 0;
  const achieved = attemptedEnough && scoredEnough && preloadAvailable && movementSatisfied && correctGoal;
  const failures = buildGoalFailures({
    requestedShots,
    wantsMovement,
    wantsPreloadShot,
    moved,
    preloadAvailable,
    attemptedEnough,
    scoredEnough,
    correctGoal,
    summary,
  });

  const observations = [
    movementSatisfied
      ? wantsMovement ? `Movement happened before/around the shot (${summary.driveDistance.toFixed(1)} in of recorded path).` : "No movement requirement was detected in the goal."
      : "The goal asked for movement, but the recorded path did not show meaningful movement.",
    attemptedEnough
      ? `The robot fired ${summary.shotSuccessRate.attempted} artifact${summary.shotSuccessRate.attempted === 1 ? "" : "s"}.`
      : `The goal asked for ${requestedShots} shot${requestedShots === 1 ? "" : "s"}, but only ${summary.shotSuccessRate.attempted} fired.`,
    scoredEnough
      ? `The classifier recorded ${summary.score.shotsMade} made shot${summary.score.shotsMade === 1 ? "" : "s"} for ${summary.score.totalPoints} point${summary.score.totalPoints === 1 ? "" : "s"}.`
      : `The classifier recorded ${summary.score.shotsMade} made shot${summary.score.shotsMade === 1 ? "" : "s"}, below the goal of ${requestedShots}.`,
    correctGoal ? "No wrong-alliance goal score was recorded." : `${summary.score.wrongGoalShots} shot crossed the wrong-alliance classifier.`,
  ];

  return {
    intendedGoal: normalizedGoal,
    requestedShots,
    wantsMovement,
    wantsPreloadShot,
    achieved,
    summary: achieved
      ? `Goal met: the run ${wantsMovement ? "moved, " : ""}fired ${summary.shotSuccessRate.attempted} artifact${summary.shotSuccessRate.attempted === 1 ? "" : "s"}, and scored ${summary.score.shotsMade}/${Math.max(1, requestedShots)} requested shot${Math.max(1, requestedShots) === 1 ? "" : "s"}.`
      : `Goal not met: ${failures[0]?.message || observations.filter((item) => item.includes("but") || item.includes("wrong-alliance")).join(" ") || "the recorded score did not match the intended objective."}`,
    observations,
    failures,
  };
}

function summarizeFrames(frames: TelemetryFrame[]): TelemetrySummary {
  const telemetry = latestTelemetry(frames);
  const score = latestScore(frames);
  const events = scoreEvents(frames);
  const finalFrame = frames.at(-1);
  const attempted = attemptedShotCount(frames, telemetry?.shotSuccessRate.attempted || 0);
  const successful = score.shotsMade;
  const velocitySamples = frames
    .map((frame) => frame.decodeTelemetry?.robotVelocity.linearSpeedInchesPerSecond || 0)
    .filter((speed) => speed > 0);
  const maxSpeed = velocitySamples.length ? Math.max(...velocitySamples) : 0;
  const warnings = Array.from(new Set(frames.map((frame) => frame.warning).filter(Boolean) as string[]));
  const notableEvents = Array.from(new Set(frames.map((frame) => frame.event).filter(Boolean) as string[])).slice(-12);
  // The autonomous preview is generated before live physics. A live intake can
  // later convert a preview-only unloaded-shot warning into a real shot, so the
  // frame warning is the authority for whether that violation still applies.
  const hasUnloadedShotWarning = frames.some((frame) => frame.warning === "No artifact loaded to shoot");
  const ruleViolations = (telemetry?.ruleViolations || []).filter((violation) => (
    violation.code !== "CONTROL_LIMIT"
      || violation.message !== "Shoot command ran without a loaded artifact."
      || hasUnloadedShotWarning
  ));
  const driveDistance = frames.reduce((distance, frame, index) => {
    const previous = frames[index - 1];
    if (!previous) return distance;
    return distance + Math.hypot(frame.x - previous.x, frame.y - previous.y);
  }, 0);

  return {
    duration: frames.at(-1)?.time || 0,
    frameCount: frames.length,
    autonomousScoringTotal: score.totalPoints || telemetry?.autonomousScoringTotal || 0,
    teleOpScoringTotal: telemetry?.teleOpScoringTotal || 0,
    score,
    scoreEvents: events,
    artifactCount: telemetry?.artifactCount || { preloaded: 0, collected: 0, stored: 0, fired: 0, controlled: 0 },
    shotSuccessRate: {
      successful,
      attempted,
      percent: attempted > 0 ? Math.round(successful / attempted * 100) : 0,
    },
    flywheelEfficiency: telemetry?.flywheelEfficiency || { targetRpm: 0, actualRpm: 0, rpmError: 0, percent: 100 },
    robotVelocity: {
      linearSpeedInchesPerSecond: maxSpeed,
      speedVariance: telemetry?.robotVelocity.speedVariance || 0,
      averageDrivePower: telemetry?.robotVelocity.averageDrivePower || 0,
    },
    ruleViolations,
    warnings,
    notableEvents,
    finalPose: {
      x: finalFrame?.x || 0,
      y: finalFrame?.y || 0,
      heading: finalFrame?.heading || 0,
    },
    driveDistance,
  };
}

function buildMockFeedback(goal: string, frames: TelemetryFrame[], question?: string): AIFeedback {
  const summary = summarizeFrames(frames);
  const violations = summary.ruleViolations;
  const hasViolation = violations.length > 0;
  const hasShotData = summary.shotSuccessRate.attempted > 0;
  const rpmReady = summary.flywheelEfficiency.targetRpm === 0 || summary.flywheelEfficiency.percent >= 92;
  const goalEvaluation = evaluateGoal(goal, summary);
  const status: AIFeedback["status"] = hasViolation || !goalEvaluation.achieved || (hasShotData && summary.shotSuccessRate.percent < 70) || !rpmReady ? "warning" : "complete";
  const topViolation = violations[0];
  const primaryFailure = goalEvaluation.failures[0];

  const summaryMarkdown = [
    `**Intended goal:** ${goalEvaluation.intendedGoal}`,
    `**Goal check:** ${goalEvaluation.achieved ? "met" : "not met"}`,
    `**Score:** ${summary.score.totalPoints} pts, ${summary.score.shotsMade}/${summary.shotSuccessRate.attempted} shots made`,
    `**Classifier:** ${summary.score.classifiedShots} classified, ${summary.score.overflowShots} overflow, ${summary.score.wrongGoalShots} wrong-goal`,
    `**Artifacts:** ${summary.artifactCount.preloaded} preloaded, ${summary.artifactCount.collected} collected, ${summary.artifactCount.stored} stored, ${summary.artifactCount.fired} fired`,
    `**Shot tracking:** ${summary.shotSuccessRate.successful}/${summary.shotSuccessRate.attempted} successful (${summary.shotSuccessRate.percent}%) from recorded classifier crossings`,
    `**Flywheel:** ${Math.round(summary.flywheelEfficiency.actualRpm)} / ${Math.round(summary.flywheelEfficiency.targetRpm)} RPM (${summary.flywheelEfficiency.percent}% match)`,
    `**Drive:** peak ${summary.robotVelocity.linearSpeedInchesPerSecond.toFixed(1)} in/s, variance ${summary.robotVelocity.speedVariance.toFixed(1)}`,
    `**Rule flags:** ${violations.length ? violations.map((violation) => violation.code).join(", ") : "none"}`,
  ].join("\n");
  const nextTest = goalEvaluation.achieved
    ? `Run the same routine 3-5 times from the same start pose and confirm it still scores ${Math.max(1, goalEvaluation.requestedShots)}/${Math.max(1, goalEvaluation.requestedShots)}.`
    : primaryFailure?.nextTest || (hasShotData
      ? "Replay the run and watch the shot at the classifier. Confirm whether it missed the square, crossed the wrong goal, or fired before alignment."
      : "Run a short test that only spins the flywheel and shoots the preload, then add movement back after the shot is visible.");

  return {
    headline: goalEvaluation.achieved
      ? `Goal met: ${summary.score.shotsMade} scored shot${summary.score.shotsMade === 1 ? "" : "s"}`
      : "Goal not met yet",
    status,
    happened: `${goalEvaluation.summary} Intended goal: "${goalEvaluation.intendedGoal}".`,
    cause: topViolation
      ? `${topViolation.code}: ${topViolation.message}`
      : goalEvaluation.achieved
        ? "The recorded classifier event confirms the shot entered the correct alliance classifier. The flywheel was at target speed when the shot fired."
        : !rpmReady
          ? "The shooter fed before the flywheel reached the target RPM tolerance needed for a reliable DECODE trajectory."
          : primaryFailure?.cause || "The recorded classifier and shot events did not satisfy the intended goal.",
    evidence: [
      `Intended goal: ${goalEvaluation.intendedGoal}`,
      ...goalEvaluation.failures.map((failure) => failure.message),
      ...goalEvaluation.observations,
      `Recorded score ${summary.score.totalPoints} points: ${summary.score.classifiedShots} classified, ${summary.score.overflowShots} overflow, ${summary.score.wrongGoalShots} wrong-goal.`,
      `Classifier shot success ${summary.shotSuccessRate.successful}/${summary.shotSuccessRate.attempted} (${summary.shotSuccessRate.percent}%).`,
      `Score events: ${summary.scoreEvents.length ? summary.scoreEvents.map((event) => `${event.result} shot ${event.shotId} at ${event.time.toFixed(2)}s`).join("; ") : "none recorded"}.`,
      `Flywheel error ${Math.round(summary.flywheelEfficiency.rpmError)} RPM; efficiency ${summary.flywheelEfficiency.percent}%.`,
      `Rule violations: ${violations.length ? violations.map((violation) => violation.code).join(", ") : "none"}.`,
      ...summary.warnings.slice(0, 2),
    ],
    fix: topViolation
      ? "Adjust the start pose, drive target, or artifact-control sequence so the robot footprint stays inside the field and controls no more than 3 artifacts."
      : goalEvaluation.achieved
        ? "No fix is required for this goal. Keep this run as a baseline, then repeat it several times to check consistency."
        : primaryFailure?.action || (hasShotData && summary.shotSuccessRate.percent < 70
          ? "Add a wait after spinFlywheel, keep shot angles between 32 and 58 degrees, and fire only when actual RPM is within 8% of target."
          : "Make the smallest code change that directly targets the failed part of the goal: movement, shot timing, or classifier alignment."),
    optimization: question
      ? `For the question "${question}", the highest leverage answer is to compare shot timing against RPM readiness before changing the path.`
      : goalEvaluation.achieved
        ? "After this goal is repeatable, try shortening the drive path or adding a second artifact cycle."
        : primaryFailure?.optimization || "Once the failed part is fixed, optimize by reducing wait time or path distance without lowering shot reliability.",
    concept: "The AI checks the intended goal against recorded physics playback. A shoot command is only considered successful when a classifier score event appears.",
    nextTest,
    summaryMarkdown,
  };
}

function structuredResponse(feedback: AIFeedback, mode: AnalyzeResponse["mode"], content: string): AnalyzeResponse {
  const created = Math.floor(Date.now() / 1000);
  const assistantMessage: AIChatMessage = {
    id: `${mode}-${created}`,
    role: "assistant",
    content,
    createdAt: Date.now(),
  };

  return {
    feedback,
    assistantMessage,
    mode,
    openai: {
      id: `chatcmpl-${mode}-${created}`,
      object: "chat.completion",
      created,
      model: mode === "mock" ? "mock-decode-telemetry-engine" : "gpt-4.1-mini",
      choices: [{
        index: 0,
        message: { role: "assistant", content: JSON.stringify({ feedback, assistantMessage }) },
        finish_reason: "stop",
      }],
    },
  };
}

function buildFollowUpContent(question: string, goal: string, summary: TelemetrySummary, goalEvaluation: GoalEvaluation) {
  const lower = question.toLowerCase();
  const hasScored = summary.score.shotsMade > 0;
  const needsArtifact = summary.artifactCount.stored <= 0;

  if (/(score|point|more|increase|improve|optimi[sz]e)/.test(lower)) {
    const nextCycle = needsArtifact
      ? "add a pickup cycle first: drive to a nearby artifact or loading-zone row, run intakeSpinIn(), then return to a shooting pose."
      : "use the stored artifact for a second shot before driving away.";
    return [
      hasScored
        ? `You already scored ${summary.score.totalPoints} point${summary.score.totalPoints === 1 ? "" : "s"} from ${summary.score.shotsMade} classified shot${summary.score.shotsMade === 1 ? "" : "s"}.`
        : "The fastest way to score more is to make the first classifier shot reliable before adding extra cycles.",
      `To score more, ${nextCycle}`,
      "Keep the flywheel spun up between shots if possible, and only shorten the drive/wait time after the second shot is consistent.",
    ].join("\n");
  }

  if (/(miss|why|failed|not score|didn.t score)/.test(lower)) {
    return [
      goalEvaluation.achieved
        ? "This run did meet the stated goal, so there is no scoring failure in the recorded playback."
        : "The recorded playback did not satisfy the intended goal.",
      summary.scoreEvents.length
        ? `The classifier event log recorded: ${summary.scoreEvents.map((event) => `${event.result} shot ${event.shotId} at ${event.time.toFixed(2)}s`).join("; ")}.`
        : "No classifier score event was recorded, so inspect shot angle, robot heading, and flywheel readiness first.",
      `Flywheel was ${summary.flywheelEfficiency.percent}% matched to target RPM at the end of the run.`,
    ].join("\n");
  }

  if (/(code|command|what.*write|how.*write)/.test(lower)) {
    return [
      "A simple next step is to keep your current first score, then add a controlled pickup-and-shoot sequence.",
      "Use intakeSpinIn(), drive to an artifact, wait briefly while the intake contacts it, then drive back to a shooting pose and call shoot(angle).",
      "Do not add the second shot until telemetry shows the robot actually has another artifact stored.",
    ].join("\n");
  }

  return [
    `For the goal "${goal}", the recorded run ${goalEvaluation.achieved ? "met" : "did not meet"} the objective.`,
    `Score: ${summary.score.totalPoints} points from ${summary.score.shotsMade}/${summary.shotSuccessRate.attempted} made shots.`,
    "Ask about scoring more, why a shot missed, or what command to add next for a more specific recommendation.",
  ].join("\n");
}

async function runOpenAI(payload: AnalyzeRequest, feedback: AIFeedback) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "mock") return null;

  const summary = summarizeFrames(payload.frames || []);
  const goalEvaluation = evaluateGoal(payload.goal || "Improve DECODE performance.", summary);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: [
            "You are the AI mentor inside GCET, an FTC DECODE simulator.",
            "Use the provided app context, DECODE terminology, command model, and telemetry only.",
            "First decide whether the user's intended goal was met, then explain that decision in plain language.",
            "Return actionable coaching in markdown. Be specific, concise, and avoid generic encouragement.",
            payload.question ? "For follow-up questions, answer the question directly in 2-4 short bullets and do not restate the full telemetry summary." : "",
            "Never count a shot as scored unless summary.score or summary.scoreEvents says it scored.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            context: decodeContext,
            goal: payload.goal,
            intendedGoal: payload.goal,
            goalEvaluation,
            question: payload.question,
            summary,
            instruction: "Treat summary.score and summary.scoreEvents as authoritative because they come from the recorded physics playback and classifier crossing detector.",
            recentMessages: (payload.messages || []).slice(-8),
          }),
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) return null;
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) return null;
  return structuredResponse(payload.question ? feedback : { ...feedback, summaryMarkdown: content }, "openai", content);
}

export async function POST(request: NextRequest) {
  const payload = await request.json() as AnalyzeRequest;
  const frames = Array.isArray(payload.frames) ? payload.frames : [];
  const goal = payload.goal || "Improve DECODE performance.";
  const feedback = buildMockFeedback(goal, frames, payload.question);
  const summary = summarizeFrames(frames);
  const goalEvaluation = evaluateGoal(goal, summary);
  const mockContent = payload.question
    ? buildFollowUpContent(payload.question, goal, summary, goalEvaluation)
    : `${feedback.happened}\n\n${feedback.summaryMarkdown}`;

  const openaiResponse = await runOpenAI({ ...payload, frames }, feedback);
  if (openaiResponse) return NextResponse.json(openaiResponse);

  await delay(600);
  return NextResponse.json(structuredResponse(feedback, "mock", mockContent));
}
