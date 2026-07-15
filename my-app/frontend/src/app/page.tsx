import Link from "next/link";

const features = [
  { number: "01", title: "Define the goal", text: "Describe what the robot should accomplish and provide the code you want to test." },
  { number: "02", title: "Run the simulation", text: "Watch the robot execute your code on the virtual field while RoboLab records its behavior." },
  { number: "03", title: "Compare and refine", text: "RoboLab's AI compares the recorded result with your intended goal, explains any gap, and suggests ways to improve the code." },
];

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="nav-links"><Link href="/simulator?mode=sandbox">Sandbox</Link><Link href="/learn">Learning mode</Link></div>
        <Link href="/simulator?mode=sandbox" className="button button-secondary">Open sandbox <span>↗</span></Link>
      </nav>

      <section className="choice-hero">
        <div className="choice-hero-copy">
          <div className="eyebrow"><span>●</span> ROBOLAB FTC · VIRTUAL ROBOTICS LAB</div>
          <h1>Simulate your robot.<br /><em>Refine your code.</em></h1>
          <p>Choose an open FTC simulation workspace or a structured learning path that introduces the same tools gradually.</p>
        </div>

        <div className="mode-choice-grid" aria-label="Choose how to use RoboLab">
          <article className="mode-choice sandbox-choice">
            <div className="mode-choice-top"><span>OPEN WORKSPACE</span><b>01</b></div>
            <div>
              <h2>Sandbox</h2>
              <p>Start with the complete simulator. Configure the field and robot, write code, run Autonomous or TeleOp, and experiment without a prescribed sequence.</p>
            </div>
            <ul><li>All simulator controls available</li><li>Autonomous and TeleOp</li><li>Telemetry, scoring, playback, and AI feedback</li></ul>
            <Link href="/simulator?mode=sandbox" className="button button-primary">Open the sandbox <span>→</span></Link>
          </article>

          <article className="mode-choice learning-choice">
            <div className="mode-choice-top"><span>GUIDED PROGRESSION</span><b>02</b></div>
            <div>
              <h2>Learning mode</h2>
              <p>Begin with fewer choices and unlock more of the lab as you progress through a structured sequence of levels.</p>
            </div>
            <div className="learning-rail" aria-label="Learning mode progression"><span className="active">1</span><i /><span>2</span><i /><span>3</span></div>
            <Link href="/learn" className="button learning-button">View the learning path <span>→</span></Link>
          </article>
        </div>
      </section>

      <section className="workflow hybrid-workflow">
        <div className="section-heading">
          <div><span className="section-number">THE ROBOLAB LOOP</span><h2>Test the code. Understand the result.</h2></div>
          <p>Define the intended outcome, run the robot, and use RoboLab&apos;s analysis to see what matched, what did not, and what to change.</p>
        </div>
        <div className="workflow-grid">
          {features.map((feature) => <article key={feature.number}><span>{feature.number}</span><h2>{feature.title}</h2><p>{feature.text}</p></article>)}
        </div>
      </section>
    </main>
  );
}
