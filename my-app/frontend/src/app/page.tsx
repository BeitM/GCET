"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/hooks/useTranslation";

export default function LandingPage() {
  const { t } = useTranslation();
  const paths = [
    { level: "01", tag: t("beginner"), title: t("beginnerPathTitle"), description: t("beginnerPathDescription"), outcome: t("beginnerPathOutcome"), href: "/simulator?level=beginner", cta: t("beginnerPathCta"), accent: "cyan" },
    { level: "02", tag: t("intermediate"), title: t("intermediatePathTitle"), description: t("intermediatePathDescription"), outcome: t("intermediatePathOutcome"), href: "/simulator?level=intermediate", cta: t("intermediatePathCta"), accent: "purple" },
    { level: "03", tag: t("advanced"), title: t("advancedPathTitle"), description: t("advancedPathDescription"), outcome: t("advancedPathOutcome"), href: "/simulator?level=advanced", cta: t("advancedPathCta"), accent: "amber" },
  ];
  const loop = [
    ["1", t("tellGoal"), t("tellGoalDescription")],
    ["2", t("pressRun"), t("pressRunDescription")],
    ["3", t("understandWhy"), t("understandWhyDescription")],
  ];

  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link>
        <div className="nav-links"><a href="#paths">{t("learningPaths")}</a><a href="#how-it-works">{t("howItWorks")}</a></div>
        <LanguageSwitcher />
        <Link href="/simulator?level=beginner" className="button button-secondary">{t("tryMission")} <span>↗</span></Link>
      </nav>

      <section className="hero beginner-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span>●</span> {t("safePlace")}</div>
          <h1>{t("heroTitle")}<br /><em>{t("heroTitleAccent")}</em></h1>
          <p className="hero-lede">{t("heroDescription")}</p>
          <div className="plain-proof">
            <span>{t("noHardware")}</span><span>{t("beginnerMissionIncluded")}</span><span>{t("nothingToInstall")}</span>
          </div>
          <div className="hero-actions">
            <Link href="/simulator?level=beginner" className="button button-primary">{t("startZeroExperience")} <span>→</span></Link>
            <a href="#paths" className="text-link">{t("chooseMyLevel")} <span>↓</span></a>
          </div>
        </div>

        <div className="hero-visual lab-preview" aria-label={t("missionPreviewLabel")}>
          <div className="preview-topbar"><span><i /> {t("firstMission")}</span><span>{t("aboutThreeMinutes")}</span></div>
          <div className="mission-preview">
            <div className="mission-copy"><small>{t("yourGoal")}</small><strong>{t("driveForward24")}</strong><p>{t("codeReady")}</p></div>
            <div className="mini-code"><span>1</span><code>driveForward(<b>24</b>);</code><span>2</span><code>driveLeft(<b>12</b>);</code></div>
            <div className="mini-stage"><div className="stage-grid" /><div className="start-flag">{t("start")}</div><div className="finish-flag">{t("goal")}</div><svg viewBox="0 0 300 130" aria-hidden="true"><path d="M62 100 C100 100 126 84 152 65 S210 38 247 38" /></svg><div className="tiny-robot">↑<b>{t("bot")}</b></div></div>
            <div className="preview-run"><span><i /> {t("readyToSimulate")}</span><strong>▶ {t("runMission")}</strong></div>
          </div>
        </div>
      </section>

      <section className="what-is-this">
        <div><span className="section-number">{t("whatIsItSection")}</span><h2>{t("flightSimulatorTitle")}<br />{t("flightSimulatorAccent")}</h2></div>
        <div className="definition-grid">
          <p><b>{t("codeTerm")}</b><span>{t("codeDefinition")}</span></p>
          <p><b>{t("simulationTerm")}</b><span>{t("simulationDefinition")}</span></p>
          <p><b>{t("telemetryTerm")}</b><span>{t("telemetryDefinition")}</span></p>
        </div>
      </section>

      <section id="paths" className="level-section">
        <div className="section-heading"><div><span className="section-number">{t("choosePathSection")}</span><h2>{t("startWhereYouAre")}<br />{t("growWhenReady")}</h2></div><p>{t("switchLevelsAnytime")}</p></div>
        <div className="level-grid">
          {paths.map((path) => (
            <article className={`level-card ${path.accent}`} key={path.tag}>
              <div className="level-top"><span>{path.level}</span><b>{path.tag}</b></div>
              <h3>{path.title}</h3><p>{path.description}</p>
              <div className="level-outcome"><small>{t("youllLearnTo")}</small><strong>{path.outcome}</strong></div>
              <Link href={path.href}>{path.cta} <span>→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="new-workflow">
        <div className="section-heading"><div><span className="section-number">{t("howItWorksSection")}</span><h2>{t("oneLoopTitle")}</h2></div><p>{t("oneLoopDescription")}</p></div>
        <div className="loop-grid">{loop.map(([number, title, text]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className="first-step">
        <div><span className="eyebrow">{t("yourFirstWin")}</span><h2>{t("moveUnderThree")}</h2><p>{t("provideEverything")}</p></div>
        <Link href="/simulator?level=beginner" className="button button-primary">{t("startBeginnerMission")} <span>→</span></Link>
      </section>
    </main>
  );
}
