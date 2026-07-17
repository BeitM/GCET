import type { AllianceColor, CoordinateSystem } from "@/lib/types";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type LearningScenario = {
  id: string;
  level: ExperienceLevel;
  number: string;
  title: string;
  focus: string;
  description: string;
  goal: string;
  starterCode: string;
  startPose: { x: number; y: number; heading: number };
  preloadCount: number;
  allianceColor: AllianceColor;
  coordinateSystem: CoordinateSystem;
  successCriteria: string[];
};

export type ComplexityLevelDefinition = {
  id: ExperienceLevel;
  number: 1 | 2 | 3;
  title: string;
  accent: "cyan" | "purple" | "amber";
  syntaxLabel: string;
  description: string;
  syntaxNote: string;
  skills: string[];
  sandboxGoal: string;
  sandboxCode: string;
  scenarios: LearningScenario[];
};

// Scenario poses are deliberate teaching setups rather than randomized or
// official FTC starting locations. Related motor-control lessons reuse poses
// so students can compare syntax without also changing the field problem.
export const complexityLevels: ComplexityLevelDefinition[] = [
  {
    id: "beginner",
    number: 1,
    title: "Command Basics",
    accent: "cyan",
    syntaxLabel: "Simple robot commands",
    description: "Build a sequence with readable movement, turning, intake, and shooter commands.",
    syntaxNote: "RoboLab commands run from top to bottom. Each line describes one robot action.",
    skills: ["Sequence actions", "Use inches and degrees", "Connect code to field movement"],
    sandboxGoal: "Test simple robot commands on the DECODE field.",
    sandboxCode: `driveToPosition(72, 90, 145);
spinFlywheel(2400);
shoot(60);`,
    scenarios: [
      {
        id: "level-1-navigation",
        level: "beginner",
        number: "1A",
        title: "Move and Face",
        focus: "Sequence movement commands and finish at an absolute heading.",
        description: "Use three simple commands to connect code order with the robot's path.",
        goal: "Complete this exact path: drive forward 24 inches, strafe right 12 inches, then finish at a 90 degree heading.",
        starterCode: `driveForward(24);
// TODO: strafe right 12 inches
// TODO: finish at a 90 degree heading`,
        startPose: { x: 24, y: 120, heading: 0 },
        preloadCount: 0,
        allianceColor: "blue",
        coordinateSystem: "corner",
        successCriteria: ["First move forward 24 inches", "Then strafe right 12 inches", "Finish at a 90 degree heading"],
      },
      {
        id: "level-1-preload",
        level: "beginner",
        number: "1B",
        title: "Score the Preload",
        focus: "Coordinate position, flywheel speed, and one scored shot.",
        description: "Build a short scoring sequence from readable high-level commands.",
        goal: "Score the single preloaded artifact in the blue classifier: drive to (72, 90) facing 145 degrees, spin to 2400 RPM, and fire once at 60 degrees.",
        starterCode: `driveToPosition(72, 90, 145);
// TODO: spin the flywheel to the target RPM
// TODO: fire the preload at the target angle`,
        startPose: { x: 72, y: 72, heading: 90 },
        preloadCount: 1,
        allianceColor: "blue",
        coordinateSystem: "corner",
        successCriteria: ["Reach the specified shooting pose", "Fire exactly one preload at 2400 RPM and 60 degrees", "Record one blue classified shot"],
      },
    ],
  },
  {
    id: "intermediate",
    number: 2,
    title: "Motor Control",
    accent: "purple",
    syntaxLabel: "FTC-style hardware methods",
    description: "Control individual motors with setPower(), keep power active with wait(), and stop mechanisms explicitly.",
    syntaxNote: "This level mirrors common FTC hardware calls while keeping timing and scoring helpers approachable.",
    skills: ["Set mecanum motor power", "Manage mechanism state", "Use timed open-loop control"],
    sandboxGoal: "Experiment with individual FTC-style motor power calls and explicit timing.",
    sandboxCode: `frontLeftDrive.setPower(0.5);
frontRightDrive.setPower(0.5);
rearLeftDrive.setPower(0.5);
rearRightDrive.setPower(0.5);
wait(1);
stopDriveMotors();`,
    scenarios: [
      {
        id: "level-2-timed-drive",
        level: "intermediate",
        number: "2A",
        title: "Timed Motor Drive",
        focus: "Control all four drive motors with power, elapsed time, and an explicit stop.",
        description: "Replace a high-level drive command with open-loop drivetrain control.",
        goal: "Power all four drive motors at 0.5 for exactly 1.0 second, then stop every drive motor.",
        starterCode: `frontLeftDrive.setPower(0.5);
frontRightDrive.setPower(0.5);
// TODO: set both rear drive motors to the same power
wait(1);
// TODO: stop the drivetrain`,
        startPose: { x: 48, y: 108, heading: 0 },
        preloadCount: 0,
        allianceColor: "blue",
        coordinateSystem: "corner",
        successCriteria: ["Set all four drive motors to 0.5", "Keep that power active for wait(1)", "End with all drive motors stopped"],
      },
      {
        id: "level-2-flywheel",
        level: "intermediate",
        number: "2B",
        title: "Power, Wait, Fire",
        focus: "Use mirrored flywheel power, a spin-up delay, and a safe shutdown.",
        description: "Control shooter motors directly while keeping the scoring helper approachable.",
        goal: "Score the single preload: set the left and right flywheels to 0.4 and -0.4, wait 1.5 seconds, shoot once at 60 degrees, then stop all motors.",
        starterCode: `leftFlywheel.setPower(0.4);
// TODO: power the mirrored right flywheel
wait(1.5);
// TODO: shoot the preload
// TODO: stop all motors`,
        startPose: { x: 72, y: 54, heading: 145 },
        preloadCount: 1,
        allianceColor: "blue",
        coordinateSystem: "corner",
        successCriteria: ["Set the flywheels to mirrored 0.4 and -0.4 power", "Wait 1.5 seconds before firing", "Score one preload and end with all motors stopped"],
      },
    ],
  },
  {
    id: "advanced",
    number: 3,
    title: "FTC Java Structure",
    accent: "amber",
    syntaxLabel: "LinearOpMode-style Java",
    description: "Place supported hardware actions inside an FTC Java-shaped autonomous class with waitForStart() and sleep().",
    syntaxNote: "RoboLab executes a focused Java training subset; it does not compile the full FTC SDK or arbitrary Java.",
    skills: ["Read LinearOpMode structure", "Use waitForStart()", "Express timing in milliseconds"],
    sandboxGoal: "Practice a LinearOpMode-style autonomous routine using supported RoboLab hardware actions.",
    sandboxCode: `@Autonomous(name = "RoboLab Auto")
public class RoboLabAuto extends LinearOpMode {
    @Override
    public void runOpMode() {
        waitForStart();

        frontLeftDrive.setPower(0.45);
        frontRightDrive.setPower(0.45);
        rearLeftDrive.setPower(0.45);
        rearRightDrive.setPower(0.45);
        sleep(1000);
        stopDriveMotors();
    }
}`,
    scenarios: [
      {
        id: "level-3-java-drive",
        level: "advanced",
        number: "3A",
        title: "Java Autonomous Drive",
        focus: "Structure a timed drivetrain sequence inside runOpMode().",
        description: "Translate the Level 2 motor routine into RoboLab's FTC Java-shaped subset.",
        goal: "Write a LinearOpMode-style autonomous that calls waitForStart(), powers all four drive motors at 0.45, calls sleep(1000), then stops the drivetrain.",
        starterCode: `@Autonomous(name = "Timed Drive")
public class TimedDriveAuto extends LinearOpMode {
    @Override
    public void runOpMode() {
        waitForStart();

        frontLeftDrive.setPower(0.45);
        // TODO: set the other three drive motors
        sleep(1000);
        // TODO: stop the drivetrain
    }
}`,
        startPose: { x: 48, y: 108, heading: 0 },
        preloadCount: 0,
        allianceColor: "blue",
        coordinateSystem: "corner",
        successCriteria: ["Put the sequence inside runOpMode() after waitForStart()", "Set all four drive motors to 0.45", "Use sleep(1000) and then stop the drivetrain"],
      },
      {
        id: "level-3-java-preload",
        level: "advanced",
        number: "3B",
        title: "Java Preload Auto",
        focus: "Combine FTC Java structure with a complete timed shooting sequence.",
        description: "Use start gating, mechanism power, millisecond timing, scoring, and shutdown together.",
        goal: "Write a LinearOpMode-style autonomous that waits for start, powers the flywheels at 0.4 and -0.4, sleeps 1500 milliseconds, shoots the preload at 60 degrees, then stops all motors.",
        starterCode: `@Autonomous(name = "Preload Auto")
public class PreloadAuto extends LinearOpMode {
    @Override
    public void runOpMode() {
        waitForStart();

        leftFlywheel.setPower(0.4);
        // TODO: power the mirrored right flywheel
        sleep(1500);
        // TODO: shoot the preload
        // TODO: stop all motors
    }
}`,
        startPose: { x: 72, y: 54, heading: 145 },
        preloadCount: 1,
        allianceColor: "blue",
        coordinateSystem: "corner",
        successCriteria: ["Put the sequence inside runOpMode() after waitForStart()", "Use mirrored flywheel power and sleep(1500)", "Score one preload at 60 degrees and stop all motors"],
      },
    ],
  },
];

export function normalizeExperienceLevel(value: string | null | undefined): ExperienceLevel {
  if (value === "2" || value === "level-2" || value === "intermediate") return "intermediate";
  if (value === "3" || value === "level-3" || value === "advanced") return "advanced";
  return "beginner";
}

export function getComplexityLevel(level: ExperienceLevel) {
  return complexityLevels.find((item) => item.id === level) || complexityLevels[0];
}

export function getLearningScenario(id: string | null | undefined, level?: ExperienceLevel) {
  const scenarios = level ? getComplexityLevel(level).scenarios : complexityLevels.flatMap((item) => item.scenarios);
  return scenarios.find((scenario) => scenario.id === id) || scenarios[0];
}

export function getLearningScenarioNavigation(id: string) {
  const scenarios = complexityLevels.flatMap((level) => level.scenarios);
  const index = Math.max(0, scenarios.findIndex((scenario) => scenario.id === id));
  return {
    index,
    total: scenarios.length,
    previous: index > 0 ? scenarios[index - 1] : null,
    next: index < scenarios.length - 1 ? scenarios[index + 1] : null,
  };
}
