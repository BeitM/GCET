import Link from "next/link";

const levels = [
  { number: "01", title: "Level 1", accent: "cyan", level: "beginner", detail: "A focused introduction with the fewest controls visible." },
  { number: "02", title: "Level 2", accent: "purple", level: "intermediate", detail: "A guided workspace with more room to configure and experiment." },
  { number: "03", title: "Level 3", accent: "amber", level: "advanced", detail: "A structured challenge using the complete simulator toolset." },
];

export default function LearningPage() {
  return (
    <main className="landing-shell learning-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="nav-status"><span className="live-dot" /> Learning mode</div>
        <Link href="/simulator?mode=sandbox" className="button button-secondary">Open sandbox <span>↗</span></Link>
      </nav>

      <section className="learning-hero">
        <Link href="/" className="back-link">← Back to mode selection</Link>
        <div className="eyebrow"><span>●</span> STRUCTURED LEARNING MODE</div>
        <h1>Start simple.<br /><em>Build toward the full lab.</em></h1>
        <p>The curriculum details can evolve later. This structure gives each level a clear entry point while keeping every lesson connected to the same simulator.</p>
        <div className="curriculum-note"><span>STRUCTURE PREVIEW</span><p>Level names, missions, requirements, and progression rules are placeholders for now.</p></div>
      </section>

      <section className="learning-levels" aria-label="Learning levels">
        <div className="level-grid">
          {levels.map((level) => (
            <article className={`level-card ${level.accent}`} key={level.level}>
              <div className="level-top"><span>{level.number}</span><b>{level.title.toUpperCase()}</b></div>
              <h3>{level.title}</h3>
              <p>{level.detail}</p>
              <div className="level-outcome"><small>MODE</small><strong>Guided simulator</strong></div>
              <Link href={`/simulator?mode=learning&level=${level.level}`}>Enter level <span>→</span></Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
