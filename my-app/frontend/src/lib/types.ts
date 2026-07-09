export type RobotState = {
  x:number; y:number; heading:number; leftPower:number; rightPower:number;
  leftEncoder:number; rightEncoder:number; shooterTarget:number; shooterRpm:number;
  feeder:boolean; armTarget:number; armPosition:number; intake:"in"|"out"|"off";
  claw:"open"|"closed"; artifactCount:number;
};

export type CoordinateSystem = "corner" | "center";
export type ArtifactRowId = "topLoading" | "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight" | "bottomLoading";
export type ShotState = { id:number; speed:number; angle:number };
export type ArtifactPhysicsState = { id:string; row:ArtifactRowId; x:number; y:number; color:"green"|"purple"; roll:number };
export type ShotPhysicsState = { id:number; x:number; y:number; z:number; roll:number };
export type TelemetryFrame = RobotState & { time:number; event?:string; warning?:string; shot?:ShotState; artifacts?:ArtifactPhysicsState[]; shots?:ShotPhysicsState[] };
export type AIFeedback = { headline:string; status:"warning"|"complete"; happened:string; cause:string; evidence:string[]; fix:string; optimization:string; concept:string };
