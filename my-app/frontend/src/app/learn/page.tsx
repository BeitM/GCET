import Link from "next/link";
import { complexityLevels } from "@/lib/learning";

export default function LearningPage() {
  return (
    <main className="landing-shell learning-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="nav-status">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- cross-zone navigation must perform a full page load */}
          <a href="/">RoboLab Hub</a> <span aria-hidden="true">·</span> <span className="live-dot" /> Learning mode
        </div>
        <Link href="/simulator?mode=sandbox&level=1" className="button button-secondary">Open sandbox <span>↗</span></Link>
      </nav>

      <section className="learning-hero">
        <Link href="/" className="back-link">← Back to mode selection</Link>
        <div className="eyebrow"><span>●</span> STRUCTURED LEARNING MODE</div>
        <h1>Learn one robot skill.<br /><em>Build a full FTC auto.</em></h1>
        <p>Start with drivetrain and shooter fundamentals, add artifact collection, then combine every skill into complete autonomous cycles. Check each solution locally and ask the AI mentor for optional coaching.</p>
        <div className="curriculum-note"><span>SIX-LESSON PATH</span><p>Movement → shooting → intake → pickup control → preload auto → full collect-and-score cycle.</p></div>
      </section>

      <section className="learning-levels" aria-label="Learning levels">
        <div className="level-grid">
          {complexityLevels.map((level) => (
            <article className={`level-card ${level.accent}`} key={level.id}>
              <div className="level-top"><span>{String(level.number).padStart(2, "0")}</span><b>LEVEL {level.number}</b></div>
              <h3>{level.title}</h3>
              <p>{level.description}</p>
              <div className="level-outcome"><small>CODE STYLE</small><strong>{level.syntaxLabel}</strong></div>
              <ul className="level-skill-list">
                {level.skills.map((skill) => <li key={skill}>{skill}</li>)}
              </ul>
              <div className="scenario-preview-list">
                {level.scenarios.map((scenario) => (
                  <Link key={scenario.id} href={`/simulator?mode=learning&level=${level.number}&scenario=${scenario.id}`}>
                    <span>{scenario.number}</span>
                    <div><strong>{scenario.title}</strong><small>Focus · {scenario.focus}</small></div>
                    <b>→</b>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
