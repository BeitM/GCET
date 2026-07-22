import type { AllianceColor, ArtifactRowId, CoordinateSystem } from "@/lib/types";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type LearningEvaluation = {
  minDriveDistanceInches?: number;
  finalPose?: { x: number; y: number; heading: number; positionTolerance: number; headingTolerance: number };
  minCollectedArtifacts?: number;
  minStoredArtifacts?: number;
  minShotsAttempted?: number;
  minScoredShots?: number;
  requiredShot?: { targetRpm: number; rpmTolerance: number; angle: number; angleTolerance: number };
  requireIntake?: boolean;
  requireWaitForStart?: boolean;
  requireShotAfterCollection?: boolean;
  requireAllMotorsStopped?: boolean;
};

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
  artifactRows: ArtifactRowId[];
  successCriteria: string[];
  evaluation: LearningEvaluation;
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

// startPose and evaluation.finalPose use RoboLab's internal field coordinates.
// Student-facing driveToPosition() coordinates remain in the selected display system.
export const complexityLevels: ComplexityLevelDefinition[] = [
  {
    id: "beginner",
    number: 1,
    title: "Robot Foundations",
    accent: "cyan",
    syntaxLabel: "Simple robot commands",
    description: "Learn the drivetrain and shooter separately before combining mechanisms into an autonomous routine.",
    syntaxNote: "RoboLab commands run from top to bottom. Each line describes one robot action.",
    skills: ["Drive a repeatable path", "Aim the robot", "Spin up and fire a preload"],
    sandboxGoal: "Test simple robot commands on the DECODE field.",
    sandboxCode: `driveToPosition(72, 90, 145);
spinFlywheel(2400);
shoot(60);`,
    scenarios: [
      {
        id: "level-1-navigation",
        level: "beginner",
        number: "1A",
        title: "Drive and Turn",
        focus: "Build a repeatable drivetrain sequence and distinguish relative turns from field headings.",
        description: "Connect command order, distance, strafing, and heading to the robot's path.",
        goal: "Drive forward 24 inches, strafe right 12 inches, then finish facing 90 degrees.",
        starterCode: `driveForward(24);
// TODO: strafe right 12 inches
// TODO: use turnTo() to finish at the field heading of 90 degrees`,
        startPose: { x: 72, y: 72, heading: 0 },
        preloadCount: 0,
        allianceColor: "blue",
        coordinateSystem: "corner",
        artifactRows: [],
        successCriteria: ["Drive forward 24 inches", "Strafe right 12 inches", "Finish at a 90-degree field heading"],
        evaluation: {
          minDriveDistanceInches: 34,
          finalPose: { x: 96, y: 84, heading: 90, positionTolerance: 2, headingTolerance: 3 },
        },
      },
      {
        id: "level-1-preload",
        level: "beginner",
        number: "1B",
        title: "Spin Up and Shoot",
        focus: "Learn the shooter from a fixed, proven scoring pose.",
        description: "Keep the drivetrain out of the problem while you learn flywheel speed, launch angle, and scoring telemetry.",
        goal: "From the ready shooting pose, spin the flywheel to 2400 RPM and score the single preload at 60 degrees.",
        starterCode: `// TODO: spin the flywheel to 2400 RPM
// TODO: shoot the preload at 60 degrees`,
        startPose: { x: 72, y: 54, heading: 145 },
        preloadCount: 1,
        allianceColor: "blue",
        coordinateSystem: "corner",
        artifactRows: [],
        successCriteria: ["Spin the flywheel to 2400 RPM", "Fire once at 60 degrees", "Record one blue classified shot"],
        evaluation: {
          minShotsAttempted: 1,
          minScoredShots: 1,
          requiredShot: { targetRpm: 2400, rpmTolerance: 100, angle: 60, angleTolerance: 2 },
        },
      },
    ],
  },
  {
    id: "intermediate",
    number: 2,
    title: "Game Piece Control",
    accent: "purple",
    syntaxLabel: "FTC-style hardware methods",
    description: "Use drivetrain and intake motors together to acquire an artifact and move it under control.",
    syntaxNote: "Motor power remains active until another call changes it, just like open-loop FTC hardware control.",
    skills: ["Run the intake motor", "Drive into a pickup", "Stop and retreat with the artifact"],
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
        title: "Intake on the Move",
        focus: "Coordinate an intake motor with a timed drivetrain approach.",
        description: "The robot starts lined up with a center-row artifact. Drive straight forward with the intake running, then stop every motor.",
        goal: "From the lined-up start, run the intake and drive straight forward at 0.5 power for 0.5 seconds to collect an artifact, then stop all motors.",
        starterCode: `// TODO: set the intake motor power to 1

// TODO: set all four drive motor powers to 0.5, then wait 0.5 seconds

// TODO: stop every motor`,
        startPose: { x: 52, y: 84, heading: 180 },
        preloadCount: 0,
        allianceColor: "blue",
        coordinateSystem: "corner",
        artifactRows: ["topCenter"],
        successCriteria: ["Run the intake while driving straight forward", "Collect the lined-up artifact", "Finish with every motor stopped"],
        evaluation: {
          minDriveDistanceInches: 9,
          minCollectedArtifacts: 1,
          minStoredArtifacts: 1,
          requireIntake: true,
          requireAllMotorsStopped: true,
        },
      },
      {
        id: "level-2-flywheel",
        level: "intermediate",
        number: "2B",
        title: "Collect and Retreat",
        focus: "Turn a pickup into a controlled autonomous cycle segment.",
        description: "Collect from the center row, reverse away from traffic, and retain the artifact for a later shot.",
        goal: "Collect at least one artifact with the intake and a 0.5-power approach for 0.5 seconds, reverse at -0.5 power for 0.5 seconds, then stop all motors with an artifact stored.",
        starterCode: `intake.setPower(1);
frontLeftDrive.setPower(0.5);
frontRightDrive.setPower(0.5);
rearLeftDrive.setPower(0.5);
rearRightDrive.setPower(0.5);
wait(0.5);

// TODO: reverse all four drive motors at -0.5
// TODO: keep reversing for 0.5 seconds
// TODO: stop every motor`,
        startPose: { x: 52, y: 84, heading: 180 },
        preloadCount: 0,
        allianceColor: "blue",
        coordinateSystem: "corner",
        artifactRows: ["topCenter"],
        successCriteria: ["Collect an artifact during the forward approach", "Reverse away while keeping the artifact stored", "Finish with every motor stopped"],
        evaluation: {
          minDriveDistanceInches: 18,
          finalPose: { x: 52, y: 84, heading: 180, positionTolerance: 3, headingTolerance: 3 },
          minCollectedArtifacts: 1,
          minStoredArtifacts: 1,
          requireIntake: true,
          requireAllMotorsStopped: true,
        },
      },
    ],
  },
  {
    id: "advanced",
    number: 3,
    title: "FTC Autonomous Routines",
    accent: "amber",
    syntaxLabel: "LinearOpMode-style Java",
    description: "Combine drivetrain, intake, and shooter skills inside an FTC-shaped autonomous program.",
    syntaxNote: "RoboLab executes a focused Java training subset; it does not compile the full FTC SDK or arbitrary Java.",
    skills: ["Gate actions with waitForStart()", "Build a preload auto", "Complete a collect-and-score cycle"],
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
        title: "Preload Autonomous",
        focus: "Combine movement and shooting inside runOpMode().",
        description: "Build a realistic first autonomous: wait for start, drive to a known pose, spin up, score, and shut down.",
        goal: "After waitForStart(), drive to (72, 90) facing 145 degrees, power the mirrored flywheels at 0.4 and -0.4, set the hood to 60 degrees, wait 1500 milliseconds, score the preload, and stop all motors.",
        starterCode: `@Autonomous(name = "Preload Auto")
public class PreloadAuto extends LinearOpMode {
    @Override
    public void runOpMode() {
        waitForStart();

        driveToPosition(72, 90, 145);
        // TODO: power the flywheels at 0.4 and -0.4
        // TODO: set the hood to 60 degrees and sleep for spin-up
        // TODO: fire the preload
        // TODO: stop every motor
    }
}`,
        startPose: { x: 72, y: 72, heading: 90 },
        preloadCount: 1,
        allianceColor: "blue",
        coordinateSystem: "corner",
        artifactRows: [],
        successCriteria: ["Call waitForStart() before robot actions", "Move to the shooting pose and score one preload", "Finish with every motor stopped"],
        evaluation: {
          minDriveDistanceInches: 16,
          finalPose: { x: 72, y: 54, heading: 145, positionTolerance: 2, headingTolerance: 3 },
          minShotsAttempted: 1,
          minScoredShots: 1,
          requiredShot: { targetRpm: 2400, rpmTolerance: 100, angle: 60, angleTolerance: 2 },
          requireWaitForStart: true,
          requireAllMotorsStopped: true,
        },
      },
      {
        id: "level-3-java-preload",
        level: "advanced",
        number: "3B",
        title: "Full Collect-and-Score Cycle",
        focus: "Combine every prior lesson into one complete autonomous cycle.",
        description: "Acquire a field artifact, return to the proven launch pose, score it, and leave the robot safe.",
        goal: "After waitForStart(), run the intake and drive to (39, 60) facing 180 degrees to collect an artifact. Return to (72, 90) facing 145 degrees, power the mirrored flywheels at 0.4 and -0.4, set the hood to 60 degrees, wait 1500 milliseconds, score, and stop all motors.",
        starterCode: `@Autonomous(name = "Cycle Auto")
public class CycleAuto extends LinearOpMode {
    @Override
    public void runOpMode() {
        waitForStart();

        intake.setPower(1);
        // TODO: drive to (39, 60) facing 180 degrees
        intake.setPower(0);

        // TODO: return to (72, 90) facing 145 degrees
        // TODO: power the flywheels at 0.4 and -0.4
        // TODO: set the hood to 60 degrees and sleep for spin-up
        // TODO: fire the collected artifact
        // TODO: stop every motor
    }
}`,
        startPose: { x: 72, y: 54, heading: 145 },
        preloadCount: 0,
        allianceColor: "blue",
        coordinateSystem: "corner",
        artifactRows: ["topCenter"],
        successCriteria: ["Collect at least one field artifact with the intake", "Return to the proven shooting pose", "Score a collected artifact and stop every motor"],
        evaluation: {
          minDriveDistanceInches: 80,
          finalPose: { x: 72, y: 54, heading: 145, positionTolerance: 2, headingTolerance: 3 },
          minCollectedArtifacts: 1,
          minShotsAttempted: 1,
          minScoredShots: 1,
          requiredShot: { targetRpm: 2400, rpmTolerance: 100, angle: 60, angleTolerance: 2 },
          requireIntake: true,
          requireWaitForStart: true,
          requireShotAfterCollection: true,
          requireAllMotorsStopped: true,
        },
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
