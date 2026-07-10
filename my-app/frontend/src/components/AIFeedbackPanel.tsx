import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { AIFeedback, AIChatMessage } from "@/lib/types";

type AIFeedbackPanelProps = {
  data: AIFeedback | null;
  goal: string;
  messages: AIChatMessage[];
  pending: boolean;
  error?: string;
  onSend: (message: string) => void;
};

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
        ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
        : <span key={`${part}-${index}`}>{part}</span>)}
    </>
  );
}

function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="markdown-block">
      {text.split("\n").filter(Boolean).map((line, index) => {
        if (line.startsWith("- ")) return <li key={`${line}-${index}`}><InlineMarkdown text={line.slice(2)} /></li>;
        return <p key={`${line}-${index}`}><InlineMarkdown text={line} /></p>;
      })}
    </div>
  );
}

function ChatMessageBubble({ message }: { message: AIChatMessage }) {
  return (
    <div className={`chat-message ${message.role}`}>
      <span>{message.role === "user" ? "User" : "AI Assistant"}</span>
      <MarkdownBlock text={message.content} />
    </div>
  );
}

function PanelShell({ children }: { children: ReactNode }) {
  return <section className="ai-panel panel">{children}</section>;
}

export function AIFeedbackPanel({ data, goal, messages, pending, error, onSend }: AIFeedbackPanelProps) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  const report = data ? `ROBOLAB FTC SIMULATION REPORT
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
${data.optimization}

SUMMARY
${data.summaryMarkdown || ""}` : "";

  const copy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || pending) return;
    setDraft("");
    onSend(message);
  };

  if (!data && !pending) {
    return (
      <section className="ai-panel panel ai-empty">
        <div className="ai-orb">*</div>
        <span className="kicker">AI MENTOR</span>
        <h2>Ready when you are.</h2>
        <p>Run the robot code to generate DECODE telemetry.</p>
      </section>
    );
  }

  return (
    <PanelShell>
      <div className="panel-head">
        <div>
          <span className="kicker">AI MENTOR</span>
          <h2>{data?.headline || "Analyzing DECODE telemetry"}</h2>
        </div>
        <span className={`analysis-status ${data?.status || "complete"}`}>{pending ? "ANALYZING" : data?.status === "warning" ? "ACTION NEEDED" : "READY"}</span>
      </div>

      {error && <div className="ai-error">{error}</div>}

      {data && (
        <>
          <div className="feedback-lead"><span>WHAT HAPPENED</span><p>{data.happened}</p></div>
          {data.summaryMarkdown && <MarkdownBlock text={data.summaryMarkdown} />}
          <div className="feedback-grid">
            <article><span>LIKELY CAUSE</span><p>{data.cause}</p></article>
            <article className="evidence"><span>TELEMETRY EVIDENCE</span><ul>{data.evidence.map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article className="fix"><span>SUGGESTED FIX</span><p>{data.fix}</p></article>
            <article><span>OPTIMIZATION IDEA</span><p>{data.optimization}</p></article>
          </div>
          <div className="concept"><b>CONCEPT // WHY THIS WORKS</b><p>{data.concept}</p></div>
        </>
      )}

      <div className="chat-thread">
        {messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)}
        {pending && <div className="chat-message assistant pending"><span>AI Assistant</span><p>Analyzing telemetry...</p></div>}
        <div ref={chatEndRef} />
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={pending}
          placeholder="Ask about scoring, RPM, path legality, or rule risk"
        />
        <button type="submit" disabled={pending || !draft.trim()}>Send</button>
      </form>

      {data && (
        <div className="report-tools">
          <button onClick={copy}>{copied ? "Report copied" : "Copy debug report"}</button>
          <div>
            <span>Was this feedback helpful?</span>
            <button className={rating === "up" ? "selected" : ""} onClick={() => setRating("up")}>Up</button>
            <button className={rating === "down" ? "selected" : ""} onClick={() => setRating("down")}>Down</button>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
