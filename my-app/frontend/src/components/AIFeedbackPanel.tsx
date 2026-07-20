import { useState } from "react";
import { AIFeedback } from "@/lib/types";
import { useTranslation } from "@/hooks/useTranslation";

export function AIFeedbackPanel({ data, goal }: { data: AIFeedback | null; goal: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  if (!data) {
    return (
      <section className="ai-panel panel ai-empty">
        <div className="ai-orb">*</div>
        <span className="kicker">{t("aiMentor")}</span>
        <h2>{t("aiReadyTitle")}</h2>
        <p>{t("aiReadyDescription")}</p>
      </section>
    );
  }

  const report = `${t("reportTitle")}
${t("reportGoal")}: ${goal}

${data.headline}

${t("whatHappened")}
${data.happened}

${t("likelyCause")}
${data.cause}

${t("telemetryEvidence")}
- ${data.evidence.join("\n- ")}

${t("suggestedFix")}
${data.fix}

${t("optimizationIdea")}
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
          <span className="kicker">{t("aiMentor")}</span>
          <h2>{data.headline}</h2>
        </div>
        <span className={`analysis-status ${data.status}`}>{data.status === "warning" ? t("actionNeeded") : t("analysisReady")}</span>
      </div>
      <div className="feedback-lead"><span>{t("whatHappened")}</span><p>{data.happened}</p></div>
      <div className="feedback-grid">
        <article><span>{t("likelyCause")}</span><p>{data.cause}</p></article>
        <article className="evidence"><span>{t("telemetryEvidence")}</span><ul>{data.evidence.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="fix"><span>{t("suggestedFix")}</span><p>{data.fix}</p></article>
        <article><span>{t("optimizationIdea")}</span><p>{data.optimization}</p></article>
      </div>
      <div className="concept"><b>{t("conceptWhy")}</b><p>{data.concept}</p></div>
      <div className="report-tools">
        <button onClick={copy}>{copied ? t("reportCopied") : t("copyDebugReport")}</button>
        <div>
          <span>{t("feedbackHelpful")}</span>
          <button className={rating === "up" ? "selected" : ""} onClick={() => setRating("up")}>{t("up")}</button>
          <button className={rating === "down" ? "selected" : ""} onClick={() => setRating("down")}>{t("down")}</button>
        </div>
      </div>
    </section>
  );
}
