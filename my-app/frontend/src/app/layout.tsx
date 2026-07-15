import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "RoboLab FTC — Robotics Sandbox and Learning Lab",
  description: "Experiment freely in an FTC robotics sandbox or build skills through a structured learning mode.",
=======
  title: "RoboLab FTC — Learn Robotics by Doing",
  description: "Control a virtual robot, see how code becomes movement, and learn robotics at your own level—no hardware required.",
>>>>>>> drivermode
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
