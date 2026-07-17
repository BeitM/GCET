import Link from "next/link";
import { complexityLevels } from "@/lib/learning";

export default function LearningPage() {
  return (
    <main className="landing-shell learning-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="nav-status"><span className="live-dot" /> Learning mode</div>
        <Link href="/simulator?mode=sandbox&level=1" className="button button-secondary">Open sandbox <span>↗</span></Link>
      </nav>

      <section className="learning-hero">
        <Link href="/" className="back-link">← Back to mode selection</Link>
        <div className="eyebrow"><span>●</span> STRUCTURED LEARNING MODE</div>
        <h1>Start with commands.<br /><em>Build toward FTC Java.</em></h1>
        <p>Each level changes the coding interface and introduces two field scenarios. Run the starter, change the code, then ask the AI mentor how the result compares with the mission goal.</p>
        <div className="curriculum-note"><span>THREE-LEVEL PATH</span><p>Simple action sequences progress into motor APIs and then a supported LinearOpMode-style Java subset.</p></div>
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
