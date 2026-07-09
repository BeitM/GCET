export type RobotState = {
  x:number; y:number; heading:number; leftPower:number; rightPower:number;
  leftEncoder:number; rightEncoder:number; shooterTarget:number; shooterRpm:number;
  feeder:boolean; armTarget:number; armPosition:number; intake:"in"|"out"|"off";
  claw:"open"|"closed";
};

export type TelemetryFrame = RobotState & { time:number; event?:string; warning?:string };
export type AIFeedback = { headline:string; status:"warning"|"complete"; happened:string; cause:string; evidence:string[]; fix:string; optimization:string; concept:string };
