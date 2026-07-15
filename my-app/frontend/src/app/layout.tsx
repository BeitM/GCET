import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoboLab FTC — Learn Robotics by Doing",
  description: "Control a virtual robot, see how code becomes movement, and learn robotics at your own level—no hardware required.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
