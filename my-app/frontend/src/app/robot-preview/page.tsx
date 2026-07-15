import type { Metadata } from "next";
import Link from "next/link";
import { DecodeRobotInspection } from "@/components/DecodeRobotInspection";
import styles from "./robot-preview.module.css";

export const metadata: Metadata = {
  title: "DECODE Robot CAD Preview — RoboLab FTC",
  description: "Standalone CAD-informed inspection render of FTC Team 25444's integrated DECODE robot.",
};

export default function RobotPreviewPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/simulator" aria-label="Return to the RoboLab simulator">
          <span>R</span>
          <div>
            <strong>RoboLab FTC</strong>
            <small>Robot inspection</small>
          </div>
        </Link>
        <div className={styles.titleBlock}>
          <p>TEAM 25444 · DECODE 2025–2026</p>
          <h1>CAD-informed robot preview</h1>
        </div>
        <div className={styles.gateStatus}>
          <i />
          Integration approved
        </div>
      </header>

      <DecodeRobotInspection />
    </main>
  );
}
