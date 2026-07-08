import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoboLab FTC — Virtual Robotics Lab",
  description: "AI-powered virtual simulation and debugging feedback for FTC programmers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
