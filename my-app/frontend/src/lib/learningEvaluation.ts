import { parseRobotCode } from "@/lib/autonomous";
import type { LearningScenario } from "@/lib/learning";
import type { TelemetryFrame } from "@/lib/types";

export type LearningCheckResult = {
  passed: boolean;
  headline: string;
  details: Array<{ passed: boolean; message: string }>;
};

const headingDifference = (left: number, right: number) => Math.abs(((left - right + 540) % 360) - 180);

export function evaluateLearningRun(
  scenario: LearningScenario,
  code: string,
  frames: TelemetryFrame[],
): LearningCheckResult {
  const details: LearningCheckResult["details"] = [];
  const evaluation = scenario.evaluation;
  const finalFrame = frames.at(-1);
  if (!finalFrame) {
    return { passed: false, headline: "Run the lesson before checking it.", details: [] };
  }

  const driveDistance = frames.slice(1).reduce((distance, frame, index) => {
    const previous = frames[index];
    return distance + Math.hypot(frame.x - previous.x, frame.y - previous.y);
  }, 0);
  const latestMetrics = [...frames].reverse().find((frame) => frame.decodeTelemetry)?.decodeTelemetry;
  const highestScore = frames.reduce((highest, frame) => Math.max(highest, frame.score?.shotsMade ?? 0), 0);
  const shotFrames = frames.filter((frame) => frame.shot);
  const commands = parseRobotCode(code);

  if (evaluation.minDriveDistanceInches !== undefined) {
    const passed = driveDistance >= evaluation.minDriveDistanceInches;
    details.push({ passed, message: passed
      ? `Recorded ${driveDistance.toFixed(1)} inches of drivetrain travel.`
      : `Drive farther: ${driveDistance.toFixed(1)} of ${evaluation.minDriveDistanceInches} required inches recorded.` });
  }

  if (evaluation.finalPose) {
    const positionError = Math.hypot(finalFrame.x - evaluation.finalPose.x, finalFrame.y - evaluation.finalPose.y);
    const headingError = headingDifference(finalFrame.heading, evaluation.finalPose.heading);
    const positionPassed = positionError <= evaluation.finalPose.positionTolerance;
    const headingPassed = headingError <= evaluation.finalPose.headingTolerance;
    details.push({ passed: positionPassed, message: positionPassed
      ? "The robot finished at the required field position."
      : `Final position is ${positionError.toFixed(1)} inches from the target.` });
    details.push({ passed: headingPassed, message: headingPassed
      ? `The robot finished at the required ${evaluation.finalPose.heading}-degree field heading.`
      : `Final heading is ${headingError.toFixed(1)} degrees from the ${evaluation.finalPose.heading}-degree target.` });
  }

  if (evaluation.requireIntake) {
    const passed = frames.some((frame) => frame.intake === "in");
    details.push({ passed, message: passed ? "The intake ran during the routine." : "The intake never ran inward." });
  }

  if (evaluation.minCollectedArtifacts !== undefined) {
    const collected = latestMetrics?.artifactCount.collected ?? 0;
    const passed = collected >= evaluation.minCollectedArtifacts;
    details.push({ passed, message: passed
      ? `Telemetry recorded ${collected} collected artifact${collected === 1 ? "" : "s"}.`
      : `Collect at least ${evaluation.minCollectedArtifacts} artifact; telemetry recorded ${collected}.` });
  }

  if (evaluation.minStoredArtifacts !== undefined) {
    const stored = latestMetrics?.artifactCount.stored ?? finalFrame.artifactCount;
    const passed = stored >= evaluation.minStoredArtifacts;
    details.push({ passed, message: passed
      ? `${stored} artifact${stored === 1 ? " remains" : "s remain"} stored at the end.`
      : `Keep at least ${evaluation.minStoredArtifacts} artifact stored; the run ended with ${stored}.` });
  }

  if (evaluation.minShotsAttempted !== undefined) {
    const attempted = Math.max(latestMetrics?.shotSuccessRate.attempted ?? 0, shotFrames.length);
    const passed = attempted >= evaluation.minShotsAttempted;
    details.push({ passed, message: passed
      ? `The robot fired ${attempted} shot${attempted === 1 ? "" : "s"}.`
      : `Fire at least ${evaluation.minShotsAttempted} shot; telemetry recorded ${attempted}.` });
  }

  if (evaluation.minScoredShots !== undefined) {
    const passed = highestScore >= evaluation.minScoredShots;
    details.push({ passed, message: passed
      ? `The classifier recorded ${highestScore} scored shot${highestScore === 1 ? "" : "s"}.`
      : `Score at least ${evaluation.minScoredShots} shot; the classifier recorded ${highestScore}.` });
  }

  if (evaluation.requiredShot) {
    const matchingShot = shotFrames.find((frame) => frame.shot
      && Math.abs(frame.shooterTarget - evaluation.requiredShot!.targetRpm) <= evaluation.requiredShot!.rpmTolerance
      && Math.abs(frame.shot.angle - evaluation.requiredShot!.angle) <= evaluation.requiredShot!.angleTolerance);
    const passed = Boolean(matchingShot);
    details.push({ passed, message: passed
      ? `A shot used ${matchingShot!.shooterTarget.toFixed(0)} RPM at ${matchingShot!.shot!.angle.toFixed(0)} degrees.`
      : `Use ${evaluation.requiredShot.targetRpm} RPM and a ${evaluation.requiredShot.angle}-degree shot.` });
  }

  if (evaluation.requireWaitForStart) {
    const passed = commands.some((command) => command.type === "start");
    details.push({ passed, message: passed ? "waitForStart() gates the autonomous actions." : "Add waitForStart() before the autonomous actions." });
  }

  if (evaluation.requireShotAfterCollection) {
    const collectionFrameIndex = frames.findIndex((frame) => (frame.decodeTelemetry?.artifactCount.collected ?? 0) > 0);
    const shotFrameIndex = frames.findIndex((frame) => Boolean(frame.shot));
    const passed = collectionFrameIndex >= 0 && shotFrameIndex > collectionFrameIndex;
    details.push({ passed, message: passed ? "The collected artifact was fired later in the cycle." : "Collect the artifact before calling shoot()." });
  }

  if (evaluation.requireAllMotorsStopped) {
    const passed = Object.values(finalFrame.motorPowers).every((power) => Math.abs(power) <= 0.001) && finalFrame.intake === "off";
    details.push({ passed, message: passed ? "Every motor is stopped at the end." : "Stop every drivetrain and mechanism motor at the end." });
  }

  const passed = details.length > 0 && details.every((detail) => detail.passed);
  return {
    passed,
    headline: passed ? `Lesson ${scenario.number} complete.` : "Not quite yet — use the checks below for your next run.",
    details,
  };
}
