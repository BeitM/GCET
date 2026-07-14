import Link from "next/link";

const paths = [
  {
    level: "01",
    tag: "BEGINNER",
    title: "I’m new to robotics",
    description: "Start with a ready-made robot and one tiny mission. No hardware, FTC knowledge, or setup required.",
    outcome: "Learn what code makes a robot do",
    href: "/simulator?level=beginner",
    cta: "Start my first mission",
    accent: "cyan",
  },
  {
    level: "02",
    tag: "INTERMEDIATE",
    title: "I know the basics",
    description: "Choose a robot, edit movement commands, run a test, and connect telemetry to what you see.",
    outcome: "Debug autonomous routines faster",
    href: "/simulator?level=intermediate",
    cta: "Practice and debug",
    accent: "purple",
  },
  {
    level: "03",
    tag: "ADVANCED",
    title: "I build competition code",
    description: "Control start pose, field setup, mechanisms, playback, and AI analysis in the full lab.",
    outcome: "Test and optimize with precision",
    href: "/simulator?level=advanced",
    cta: "Open the full lab",
    accent: "amber",
  },
];

const loop = [
  ["1", "Tell it the goal", "Pick a simple task, like drive forward and turn left."],
  ["2", "Press Run", "Watch the virtual robot follow the commands safely."],
  ["3", "Understand why", "Read the measurements and ask the AI coach what to change."],
];

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="nav-links"><a href="#paths">Learning paths</a><a href="#how-it-works">How it works</a></div>
        <Link href="/simulator?level=beginner" className="button button-secondary">Try a mission <span>↗</span></Link>
      </nav>

      <section className="hero beginner-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>●</span> A SAFE PLACE TO LEARN ROBOTICS</div>
          <h1>Make a robot move.<br /><em>See how your code works.</em></h1>
          <p className="hero-lede">RoboLab is a virtual practice field where you can control a robot, test ideas, and learn from mistakes—without owning a robot.</p>
          <div className="plain-proof">
            <span>✓ No hardware needed</span><span>✓ Beginner mission included</span><span>✓ Nothing to install</span>
          </div>
          <div className="hero-actions">
            <Link href="/simulator?level=beginner" className="button button-primary">Start with zero experience <span>→</span></Link>
            <a href="#paths" className="text-link">Choose my level <span>↓</span></a>
          </div>
        </div>

        <div className="hero-visual lab-preview" aria-label="Preview of a beginner robot mission">
          <div className="preview-topbar"><span><i /> FIRST MISSION</span><span>ABOUT 3 MINUTES</span></div>
          <div className="mission-preview">
            <div className="mission-copy"><small>YOUR GOAL</small><strong>Drive forward 24 inches</strong><p>The code is ready. Just press Run and watch what each line does.</p></div>
            <div className="mini-code"><span>1</span><code>driveForward(<b>24</b>);</code><span>2</span><code>driveLeft(<b>12</b>);</code></div>
            <div className="mini-stage"><div className="stage-grid" /><div className="start-flag">START</div><div className="finish-flag">GOAL</div><svg viewBox="0 0 300 130" aria-hidden="true"><path d="M62 100 C100 100 126 84 152 65 S210 38 247 38" /></svg><div className="tiny-robot">↑<b>BOT</b></div></div>
            <div className="preview-run"><span><i /> Ready to simulate</span><strong>▶ RUN MISSION</strong></div>
          </div>
        </div>
      </section>

      <section className="what-is-this">
        <div><span className="section-number">01 / WHAT IS IT?</span><h2>Think of it as a flight simulator,<br />but for learning robots.</h2></div>
        <div className="definition-grid">
          <p><b>Code</b><span>Simple instructions that tell the robot what to do.</span></p>
          <p><b>Simulation</b><span>A safe virtual test—no broken parts or field time.</span></p>
          <p><b>Telemetry</b><span>The robot’s report card: position, speed, and actions.</span></p>
        </div>
      </section>

      <section id="paths" className="level-section">
        <div className="section-heading"><div><span className="section-number">02 / CHOOSE YOUR PATH</span><h2>Start where you are.<br />Grow when you’re ready.</h2></div><p>You can switch levels anytime. Each path opens the right amount of control, explanation, and challenge.</p></div>
        <div className="level-grid">
          {paths.map((path) => (
            <article className={`level-card ${path.accent}`} key={path.tag}>
              <div className="level-top"><span>{path.level}</span><b>{path.tag}</b></div>
              <h3>{path.title}</h3><p>{path.description}</p>
              <div className="level-outcome"><small>YOU’LL LEARN TO</small><strong>{path.outcome}</strong></div>
              <Link href={path.href}>{path.cta} <span>→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="new-workflow">
        <div className="section-heading"><div><span className="section-number">03 / HOW IT WORKS</span><h2>One loop. Real understanding.</h2></div><p>RoboLab connects an instruction to movement, then shows the evidence behind the result.</p></div>
        <div className="loop-grid">{loop.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="first-step">
        <div><span className="eyebrow">YOUR FIRST WIN</span><h2>Move a virtual robot in under 3 minutes.</h2><p>We’ll provide the robot, field, and code. You only need curiosity.</p></div>
        <Link href="/simulator?level=beginner" className="button button-primary">Start the beginner mission <span>→</span></Link>
      </section>
    </main>
  );
}
