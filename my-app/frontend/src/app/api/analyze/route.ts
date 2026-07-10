import { NextRequest, NextResponse } from "next/server";

type AnalyzeTelemetryFrame = {
  time: number;
  x: number;
  y: number;
  heading: number;
  leftPower: number;
  rightPower: number;
  leftEncoder: number;
  rightEncoder: number;
  shooterTarget: number;
  shooterRpm: number;
  feeder: boolean;
  armTarget: number;
  armPosition: number;
  intake: "in" | "out" | "off";
  claw: "open" | "closed";
  artifactCount: number;
  event?: string;
  warning?: string;
};

type AnalyzeRequest = {
  goal: string;
  code: string;
  robotSetup: {
    robotId: string;
    robotName: string;
    width: number;
    length: number;
    coordinateSystem: "corner" | "center";
    startPose: { x: number; y: number; heading: number };
    preloadCount: number;
    selectedArtifactRows: string[];
  };
  telemetry: AnalyzeTelemetryFrame[];
};

type AIFeedback = {
  headline: string;
  status: "warning" | "complete";
  happened: string;
  cause: string;
  evidence: string[];
  fix: string;
  optimization: string;
  concept: string;
};

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_TELEMETRY_FRAMES = 120;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const safeText = (value: unknown, fallback: string, maxLen: number) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
};

const safeNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};

const parseJsonObject = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const sanitizeFeedback = (value: unknown): AIFeedback | null => {
  if (!isObject(value)) return null;
  const evidenceRaw = Array.isArray(value.evidence) ? value.evidence : [];
  const evidence = evidenceRaw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  const status = value.status === "warning" ? "warning" : "complete";
  return {
    headline: safeText(value.headline, "AI telemetry analysis", 140),
    status,
    happened: safeText(value.happened, "Simulation telemetry was analyzed.", 600),
    cause: safeText(value.cause, "The code and robot state sequence suggest this behavior.", 600),
    evidence: evidence.length ? evidence : ["Telemetry frames were provided to the model."],
    fix: safeText(value.fix, "Adjust code to match the intended path and rerun the simulator.", 600),
    optimization: safeText(value.optimization, "Tune powers and sequence timing for smoother execution.", 600),
    concept: safeText(value.concept, "AI compares expected intent with observed telemetry transitions.", 600),
  };
};

const sanitizeRequest = (value: unknown): AnalyzeRequest | null => {
  if (!isObject(value) || !isObject(value.robotSetup) || !Array.isArray(value.telemetry)) return null;

  const telemetry = value.telemetry
    .slice(-MAX_TELEMETRY_FRAMES)
    .filter((frame): frame is Record<string, unknown> => isObject(frame))
    .map((frame) => {
      const intake: AnalyzeTelemetryFrame["intake"] = frame.intake === "in" ? "in" : frame.intake === "out" ? "out" : "off";
      const claw: AnalyzeTelemetryFrame["claw"] = frame.claw === "open" ? "open" : "closed";
      return {
      time: safeNumber(frame.time, 0),
      x: safeNumber(frame.x, 0),
      y: safeNumber(frame.y, 0),
      heading: safeNumber(frame.heading, 0),
      leftPower: safeNumber(frame.leftPower, 0),
      rightPower: safeNumber(frame.rightPower, 0),
      leftEncoder: safeNumber(frame.leftEncoder, 0),
      rightEncoder: safeNumber(frame.rightEncoder, 0),
      shooterTarget: safeNumber(frame.shooterTarget, 0),
      shooterRpm: safeNumber(frame.shooterRpm, 0),
      feeder: Boolean(frame.feeder),
      armTarget: safeNumber(frame.armTarget, 0),
      armPosition: safeNumber(frame.armPosition, 0),
      intake,
      claw,
      artifactCount: safeNumber(frame.artifactCount, 0),
      event: typeof frame.event === "string" ? frame.event.slice(0, 120) : undefined,
      warning: typeof frame.warning === "string" ? frame.warning.slice(0, 120) : undefined,
      };
    });

  const robotSetup = value.robotSetup;
  const selectedArtifactRowsRaw = Array.isArray(robotSetup.selectedArtifactRows) ? robotSetup.selectedArtifactRows : [];
  const selectedArtifactRows = selectedArtifactRowsRaw
    .filter((row): row is string => typeof row === "string")
    .slice(0, 16);

  return {
    goal: safeText(value.goal, "Run robot routine", 800),
    code: safeText(value.code, "", 12000),
    robotSetup: {
      robotId: safeText(robotSetup.robotId, "unknown", 80),
      robotName: safeText(robotSetup.robotName, "Unknown robot", 120),
      width: safeNumber(robotSetup.width, 0),
      length: safeNumber(robotSetup.length, 0),
      coordinateSystem: robotSetup.coordinateSystem === "center" ? "center" : "corner",
      startPose: {
        x: safeNumber(isObject(robotSetup.startPose) ? robotSetup.startPose.x : undefined, 0),
        y: safeNumber(isObject(robotSetup.startPose) ? robotSetup.startPose.y : undefined, 0),
        heading: safeNumber(isObject(robotSetup.startPose) ? robotSetup.startPose.heading : undefined, 0),
      },
      preloadCount: safeNumber(robotSetup.preloadCount, 0),
      selectedArtifactRows,
    },
    telemetry,
  };
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "AI provider is not configured. Set OPENAI_API_KEY to enable analysis.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = sanitizeRequest(body);
  if (!payload) {
    return NextResponse.json({ error: "Request must include goal, code, robotSetup, and telemetry." }, { status: 400 });
  }

  const systemPrompt = [
    "You are an FTC robot coach analyzing simulation telemetry.",
    "Return only a JSON object with this exact shape:",
    "{",
    '  "headline": string,',
    '  "status": "warning" | "complete",',
    '  "happened": string,',
    '  "cause": string,',
    '  "evidence": string[],',
    '  "fix": string,',
    '  "optimization": string,',
    '  "concept": string',
    "}",
    "Requirements:",
    "- Use telemetry facts, events, warnings, and actuator values as evidence.",
    "- If behavior misses the goal, set status=warning and give a concrete fix.",
    "- Keep each field concise and practical for student robotics debugging.",
    "- Do not include markdown, code fences, or extra keys.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      {
        error: "AI analysis request failed.",
        details: details.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const completion = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "AI response did not contain content." }, { status: 502 });
  }

  const parsed = parseJsonObject(content);
  const feedback = sanitizeFeedback(parsed);
  if (!feedback) {
    return NextResponse.json({ error: "AI response JSON did not match expected feedback shape." }, { status: 502 });
  }

  return NextResponse.json(feedback);
}
