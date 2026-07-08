import Link from "next/link";

const features = [
  { number: "01", title: "Define the goal", text: "Tell RoboLab what the robot should accomplish and provide the code you want to test." },
  { number: "02", title: "Simulate the robot", text: "Run the program on a virtual FTC-style field while telemetry streams from each subsystem." },
  { number: "03", title: "Learn from the data", text: "Use AI feedback to understand behavior, debug issues, and find ways to improve performance." },
];

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="nav-status"><span className="live-dot" /> Prototype environment</div>
        <Link href="/simulator" className="button button-secondary">Open simulator <span>↗</span></Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>●</span> ROBOLAB FTC · VIRTUAL ROBOTICS LAB</div>
          <h1>Simulate your robot.<br /><em>Refine your code.</em></h1>
          <p className="hero-lede">AI-powered simulation and debugging feedback for FTC programmers.</p>
          <p className="hero-detail">Test robot programs in a virtual FTC environment, inspect live telemetry, and iterate with an AI mentor that helps explain, debug, and improve your code.</p>
          <div className="hero-actions">
            <Link href="/simulator" className="button button-primary">Launch simulator <span>→</span></Link>
            <a href="#workflow" className="text-link">See how it works <span>↓</span></a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Robot simulation preview">
          <div className="preview-topbar"><span><i /> FIELD // LIVE PREVIEW</span><span>12.4 FPS</span></div>
          <div className="mini-field">
            <div className="field-grid" />
            <div className="mini-zone zone-a">RED BASE</div>
            <div className="mini-zone zone-b">BLUE BASE</div>
            <svg className="preview-path" viewBox="0 0 500 390" preserveAspectRatio="none"><path d="M75 326 C120 300 133 230 195 225 S265 280 320 215 S352 110 430 73" /></svg>
            <div className="mini-element e1" /><div className="mini-element green e2" /><div className="mini-element e3" />
            <div className="preview-robot"><span>▲</span><b>RL-01</b></div>
            <div className="preview-callout"><span>PATH EFFICIENCY</span><strong>87%</strong></div>
          </div>
          <div className="preview-metrics">
            <div><span>POSITION</span><b>42.8, 96.2</b></div><div><span>HEADING</span><b>−12.4°</b></div><div><span>SHOOTER</span><b className="cyan">3,420 RPM</b></div>
          </div>
        </div>
      </section>

      <section id="workflow" className="workflow">
        <div className="section-label">THE ROBO LAB LOOP</div>
        <div className="workflow-grid">
          {features.map((feature) => <article key={feature.number}><span>{feature.number}</span><h2>{feature.title}</h2><p>{feature.text}</p></article>)}
        </div>
      </section>
    </main>
  );
}
