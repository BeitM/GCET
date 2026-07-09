import { AIFeedback, DemoScenario, ScenarioId } from "./types";

export const scenarios: DemoScenario[] = [
  { id:"inefficient", label:"DECODE autonomous path is inefficient", category:"PATH PLANNING", summary:"The ARTIFACT reaches the GOAL, but the route is too long.", duration:12,
    goal:"Collect the center ARTIFACT, score it in the alliance GOAL, and return toward the BASE in under 10 seconds.",
    setup:"DECODE field • Turret Shooter • Mecanum drive • Odometry enabled",
    code:`// Simplified FTC-style routine\ndriveTo(38, 104);\nturnTo(90);\nwait(1.2);\ndriveTo(82, 70);\nturnTo(24);\ndriveTo(118, 28);\nscore();`, },
  { id:"shooter", label:"ARTIFACT launches before target RPM", category:"LAUNCHER", summary:"The feeder releases an ARTIFACT while the flywheel is still accelerating.", duration:8,
    goal:"Drive into a legal DECODE LAUNCH ZONE, spin the launcher to 3,600 RPM, then feed one ARTIFACT only after the flywheel is stable.",
    setup:"DECODE field • Turret Shooter • Flywheel launcher • Velocity-controlled feeder",
    code:`shooter.setTargetRPM(3600);\nwait(0.55); // fixed delay\nfeeder.push();\nwait(0.25);\nfeeder.reset();`, },
  { id:"arm", label:"Arm overshoots target position", category:"ARM / LIFT", summary:"Open-loop power carries the arm past its target.", duration:8,
    goal:"Raise the arm smoothly to 1,250 encoder ticks without exceeding the 1,400 tick safe range.",
    setup:"Turret Shooter • Encoder-controlled mechanism • Software travel limit",
    code:`arm.setPower(0.85);\nwhile (arm.position < 1250) {\n  telemetry.update();\n}\narm.setPower(0);`, },
  { id:"intake", label:"Intake runs in the wrong direction", category:"INTAKE", summary:"Motor polarity ejects rather than collects the ARTIFACT.", duration:7,
    goal:"Approach the center ARTIFACT at its SPIKE MARK and pull it into the robot with the intake.",
    setup:"DECODE field • Turret Shooter • Continuous intake and transfer",
    code:`drive.forward(0.35);\nintake.setPower(-1.0);\nwait(2.0);\nintake.stop();`, },
  { id:"drift", label:"Drivetrain drifts off course", category:"DRIVETRAIN", summary:"Uneven power causes a growing heading error.", duration:10,
    goal:"Drive straight from the starting zone to the center line while holding a 0° heading.",
    setup:"Turret Shooter • Mecanum drive • IMU heading feedback",
    code:`leftDrive.setPower(0.70);\nrightDrive.setPower(0.70);\nwhile (distance < 96) {\n  telemetry.update();\n}\ndrive.stop();`, },
];

export const feedback: Record<ScenarioId,AIFeedback> = {
  inefficient:{headline:"Mission completed — path can be 22% faster",status:"complete",happened:"The robot collected and scored successfully, but traveled 34 inches farther than necessary and paused through two avoidable heading changes.",cause:"The route uses disconnected drive and turn commands instead of one continuous curve through the pickup point.",evidence:["Distance traveled: 168 in vs. 131 in direct route","2.4 s spent stopped or turning","Final score event registered at 11.6 s"],fix:"Replace the middle turn-drive-turn sequence with a single spline or two connected waypoints.",optimization:"Start shooter spin-up while crossing midfield to hide its acceleration time.",concept:"Path efficiency measures both distance and motion continuity. A shorter route is not always faster if it requires hard stops."},
  shooter:{headline:"Shot released 640 RPM below target",status:"warning",happened:"The feeder pushed the game element at 2,960 RPM, causing a low-energy shot before the flywheel stabilized.",cause:"A fixed 550 ms delay assumes the shooter always accelerates at the same rate. Battery voltage and load make that timing variable.",evidence:["Target: 3,600 RPM","RPM at feed: 2,960","Stable target reached 0.72 s after feed"],fix:"Gate the feeder on measured velocity: require RPM > 3,500 for at least 150 ms before firing.",optimization:"Begin spin-up during the final approach so the shooter is ready on arrival.",concept:"Closed-loop readiness checks react to the robot you have now; fixed delays only match the conditions where they were tuned."},
  arm:{headline:"Arm exceeded its safe range by 86 ticks",status:"warning",happened:"The arm reached its 1,250-tick target but inertia carried it to 1,486 ticks before settling.",cause:"Full motor power is removed only after crossing the target, with no deceleration window or position controller.",evidence:["Target: 1,250 ticks","Peak: 1,486 ticks","Safe maximum: 1,400 ticks"],fix:"Use RUN_TO_POSITION or a proportional controller and reduce power inside the final 250 ticks.",optimization:"Add gravity feed-forward to hold position without oscillation.",concept:"Stopping distance applies to mechanisms too. A controller must reduce energy before the target, not at the target."},
  intake:{headline:"Intake direction is reversed",status:"warning",happened:"The game element moved away from the robot while the routine expected it to be collected.",cause:"The configured negative power combines with a motor direction reversal, producing outward roller motion.",evidence:["Commanded power: −1.00","Observed direction: OUT","Element distance increased by 18 in"],fix:"Change the command to +1.0 or correct the motor direction in hardware configuration, but not both.",optimization:"Stop intake automatically when a beam-break sensor detects a captured element.",concept:"Motor direction settings transform the sign of every power command. Define one convention and verify it during initialization."},
  drift:{headline:"Heading error grew to 13.8°",status:"warning",happened:"The robot veered right and finished 19 inches from the intended center-line endpoint.",cause:"Equal power commands do not guarantee equal wheel speed. The loaded right side produces less linear speed.",evidence:["Left/right power: 0.70 / 0.70","Encoder delta mismatch: 9.4%","Final heading: +13.8°"],fix:"Use IMU heading feedback to continuously trim left and right power around the 0° target.",optimization:"Combine heading correction with encoder velocity control for consistent distance across battery levels.",concept:"Open-loop power controls electrical effort, not motion. Feedback closes the gap between requested and measured behavior."},
};
