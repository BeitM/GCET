export type ScenarioId = "inefficient" | "shooter" | "arm" | "intake" | "drift";

export type RobotState = {
  x:number; y:number; heading:number; leftPower:number; rightPower:number;
  leftEncoder:number; rightEncoder:number; shooterTarget:number; shooterRpm:number;
  feeder:boolean; armTarget:number; armPosition:number; intake:"in"|"out"|"off";
  claw:"open"|"closed";
};

export type TelemetryFrame = RobotState & { time:number; event?:string; warning?:string };
export type DemoScenario = { id:ScenarioId; label:string; category:string; summary:string; goal:string; code:string; setup:string; duration:number };
export type AIFeedback = { headline:string; status:"warning"|"complete"; happened:string; cause:string; evidence:string[]; fix:string; optimization:string; concept:string };
