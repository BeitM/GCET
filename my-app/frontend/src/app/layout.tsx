import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoboLab FTC — Robotics Sandbox and Learning Lab",
  description: "Experiment freely in an FTC robotics sandbox or build skills through a structured learning mode.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
