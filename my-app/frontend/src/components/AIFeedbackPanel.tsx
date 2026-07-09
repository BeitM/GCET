import { useState } from "react";
import { AIFeedback } from "@/lib/types";

export function AIFeedbackPanel({ data, goal }: { data: AIFeedback | null; goal: string }) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  if (!data) {
    return (
      <section className="ai-panel panel ai-empty">
        <div className="ai-orb">*</div>
        <span className="kicker">AI MENTOR</span>
        <h2>Ready when you are.</h2>
        <p>Run the robot code, then request AI feedback to analyze the latest telemetry.</p>
      </section>
    );
  }

  const report = `ROBOLAB FTC SIMULATION REPORT
Goal: ${goal}

${data.headline}

WHAT HAPPENED
${data.happened}

LIKELY CAUSE
${data.cause}

EVIDENCE
- ${data.evidence.join("\n- ")}

SUGGESTED FIX
${data.fix}

OPTIMIZATION
${data.optimization}`;

  const copy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="ai-panel panel">
      <div className="panel-head">
        <div>
          <span className="kicker">AI MENTOR</span>
          <h2>{data.headline}</h2>
        </div>
        <span className={`analysis-status ${data.status}`}>{data.status === "warning" ? "ACTION NEEDED" : "ANALYSIS READY"}</span>
      </div>
      <div className="feedback-lead"><span>WHAT HAPPENED</span><p>{data.happened}</p></div>
      <div className="feedback-grid">
        <article><span>LIKELY CAUSE</span><p>{data.cause}</p></article>
        <article className="evidence"><span>TELEMETRY EVIDENCE</span><ul>{data.evidence.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="fix"><span>SUGGESTED FIX</span><p>{data.fix}</p></article>
        <article><span>OPTIMIZATION IDEA</span><p>{data.optimization}</p></article>
      </div>
      <div className="concept"><b>CONCEPT // WHY THIS WORKS</b><p>{data.concept}</p></div>
      <div className="report-tools">
        <button onClick={copy}>{copied ? "Report copied" : "Copy debug report"}</button>
        <div>
          <span>Was this feedback helpful?</span>
          <button className={rating === "up" ? "selected" : ""} onClick={() => setRating("up")}>Up</button>
          <button className={rating === "down" ? "selected" : ""} onClick={() => setRating("down")}>Down</button>
        </div>
      </div>
    </section>
  );
}
