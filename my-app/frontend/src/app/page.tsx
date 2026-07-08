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

        <div className="hero-visual hero-placeholder" aria-label="Placeholder image">Placeholder image</div>
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
