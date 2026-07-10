import { NextRequest, NextResponse } from "next/server";
import type { AIChatMessage, AIFeedback, AnalyzeRequest, AnalyzeResponse, DecodeRuleViolation, TelemetryFrame } from "@/lib/types";

export const runtime = "nodejs";

type TelemetrySummary = {
  duration: number;
  frameCount: number;
  autonomousScoringTotal: number;
  teleOpScoringTotal: number;
  artifactCount: NonNullable<TelemetryFrame["decodeTelemetry"]>["artifactCount"];
  shotSuccessRate: NonNullable<TelemetryFrame["decodeTelemetry"]>["shotSuccessRate"];
  flywheelEfficiency: NonNullable<TelemetryFrame["decodeTelemetry"]>["flywheelEfficiency"];
  robotVelocity: NonNullable<TelemetryFrame["decodeTelemetry"]>["robotVelocity"];
  ruleViolations: DecodeRuleViolation[];
  warnings: string[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function latestTelemetry(frames: TelemetryFrame[]) {
  return [...frames].reverse().find((frame) => frame.decodeTelemetry)?.decodeTelemetry;
}

function summarizeFrames(frames: TelemetryFrame[]): TelemetrySummary {
  const telemetry = latestTelemetry(frames);
  const velocitySamples = frames
    .map((frame) => frame.decodeTelemetry?.robotVelocity.linearSpeedInchesPerSecond || 0)
    .filter((speed) => speed > 0);
  const maxSpeed = velocitySamples.length ? Math.max(...velocitySamples) : 0;
  const warnings = Array.from(new Set(frames.map((frame) => frame.warning).filter(Boolean) as string[]));

  return {
    duration: frames.at(-1)?.time || 0,
    frameCount: frames.length,
    autonomousScoringTotal: telemetry?.autonomousScoringTotal || 0,
    teleOpScoringTotal: telemetry?.teleOpScoringTotal || 0,
    artifactCount: telemetry?.artifactCount || { preloaded: 0, collected: 0, stored: 0, fired: 0, controlled: 0 },
    shotSuccessRate: telemetry?.shotSuccessRate || { successful: 0, attempted: 0, percent: 0 },
    flywheelEfficiency: telemetry?.flywheelEfficiency || { targetRpm: 0, actualRpm: 0, rpmError: 0, percent: 100 },
    robotVelocity: {
      linearSpeedInchesPerSecond: maxSpeed,
      speedVariance: telemetry?.robotVelocity.speedVariance || 0,
      averageDrivePower: telemetry?.robotVelocity.averageDrivePower || 0,
    },
    ruleViolations: telemetry?.ruleViolations || [],
    warnings,
  };
}

function buildMockFeedback(goal: string, frames: TelemetryFrame[], question?: string): AIFeedback {
  const summary = summarizeFrames(frames);
  const violations = summary.ruleViolations;
  const hasViolation = violations.length > 0;
  const hasShotData = summary.shotSuccessRate.attempted > 0;
  const rpmReady = summary.flywheelEfficiency.targetRpm === 0 || summary.flywheelEfficiency.percent >= 92;
  const status: AIFeedback["status"] = hasViolation || (hasShotData && summary.shotSuccessRate.percent < 70) || !rpmReady ? "warning" : "complete";
  const topViolation = violations[0];

  const summaryMarkdown = [
    `**Goal:** ${goal}`,
    `**Score:** AUTO ${summary.autonomousScoringTotal}, TELEOP ${summary.teleOpScoringTotal}`,
    `**Artifacts:** ${summary.artifactCount.preloaded} preloaded, ${summary.artifactCount.collected} collected, ${summary.artifactCount.stored} stored, ${summary.artifactCount.fired} fired`,
    `**Shots:** ${summary.shotSuccessRate.successful}/${summary.shotSuccessRate.attempted} successful (${summary.shotSuccessRate.percent}%)`,
    `**Flywheel:** ${Math.round(summary.flywheelEfficiency.actualRpm)} / ${Math.round(summary.flywheelEfficiency.targetRpm)} RPM (${summary.flywheelEfficiency.percent}% match)`,
    `**Drive:** peak ${summary.robotVelocity.linearSpeedInchesPerSecond.toFixed(1)} in/s, variance ${summary.robotVelocity.speedVariance.toFixed(1)}`,
    `**Rule flags:** ${violations.length ? violations.map((violation) => violation.code).join(", ") : "none"}`,
  ].join("\n");

  return {
    headline: status === "warning" ? "DECODE run needs scoring and rule-risk cleanup" : "DECODE run is scoring-ready",
    status,
    happened: hasShotData
      ? `The robot fired ${summary.shotSuccessRate.attempted} artifact(s), scored ${summary.shotSuccessRate.successful}, and ended with ${summary.artifactCount.stored} controlled artifact(s).`
      : `The robot completed ${summary.frameCount} telemetry frames over ${summary.duration.toFixed(2)} seconds without firing an artifact.`,
    cause: topViolation
      ? `${topViolation.code}: ${topViolation.message}`
      : rpmReady
        ? "No rule violation was recorded; scoring quality is mainly driven by artifact timing, shot angle, and flywheel readiness."
        : "The shooter fed before the flywheel reached the target RPM tolerance needed for a reliable DECODE trajectory.",
    evidence: [
      `AUTO score ${summary.autonomousScoringTotal}; TELEOP score ${summary.teleOpScoringTotal}.`,
      `Shot success ${summary.shotSuccessRate.successful}/${summary.shotSuccessRate.attempted} (${summary.shotSuccessRate.percent}%).`,
      `Flywheel error ${Math.round(summary.flywheelEfficiency.rpmError)} RPM; efficiency ${summary.flywheelEfficiency.percent}%.`,
      `Rule violations: ${violations.length ? violations.map((violation) => violation.code).join(", ") : "none"}.`,
      ...summary.warnings.slice(0, 2),
    ],
    fix: topViolation
      ? "Adjust the start pose, drive target, or artifact-control sequence so the robot footprint stays inside the field and controls no more than 3 artifacts."
      : hasShotData && summary.shotSuccessRate.percent < 70
        ? "Add a wait after spinFlywheel, keep shot angles between 32 and 58 degrees, and fire only when actual RPM is within 8% of target."
        : "Keep the current legal path and tune only the shortest wait before firing to protect shot consistency.",
    optimization: question
      ? `For the question "${question}", the highest leverage answer is to compare shot timing against RPM readiness before changing the path.`
      : "Collect one field artifact before the first shot only if the path can do it without exceeding the 3-artifact control limit.",
    concept: "FTC DECODE scoring depends on legal artifact possession, phase-aware scoring, and repeatable launch energy; the telemetry now checks each of those before producing advice.",
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

async function runOpenAI(payload: AnalyzeRequest, feedback: AIFeedback) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "mock") return null;

  const summary = summarizeFrames(payload.frames || []);
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
          content: "You are a concise FTC DECODE rulebook-aware performance assistant. Use only supplied telemetry. Return actionable coaching in markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({
            goal: payload.goal,
            question: payload.question,
            summary,
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
  return structuredResponse({ ...feedback, summaryMarkdown: content }, "openai", content);
}

export async function POST(request: NextRequest) {
  const payload = await request.json() as AnalyzeRequest;
  const frames = Array.isArray(payload.frames) ? payload.frames : [];
  const feedback = buildMockFeedback(payload.goal || "Improve DECODE performance.", frames, payload.question);
  const mockContent = payload.question
    ? `${feedback.optimization}\n\n${feedback.summaryMarkdown}`
    : `${feedback.happened}\n\n${feedback.summaryMarkdown}`;

  const openaiResponse = await runOpenAI({ ...payload, frames }, feedback);
  if (openaiResponse) return NextResponse.json(openaiResponse);

  await delay(600);
  return NextResponse.json(structuredResponse(feedback, "mock", mockContent));
}
