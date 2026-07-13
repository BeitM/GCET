export type RobotState = {
  x:number; y:number; heading:number; leftPower:number; rightPower:number;
  leftEncoder:number; rightEncoder:number; shooterTarget:number; shooterRpm:number;
  feeder:boolean; armTarget:number; armPosition:number; intake:"in"|"out"|"off";
  claw:"open"|"closed"; artifactCount:number;
};

export type CoordinateSystem = "corner" | "center";
export type AllianceColor = "blue" | "red";
export type ControlMode = "autonomous" | "teleop";
export type ArtifactRowId = "topLoading" | "topLeft" | "topCenter" | "topRight" | "bottomLeft" | "bottomCenter" | "bottomRight" | "bottomLoading";
export type ShotState = { id:number; speed:number; angle:number };
export type ArtifactPhysicsState = { id:string; row:ArtifactRowId; x:number; y:number; color:"green"|"purple"; roll:number };
export type ShotPhysicsState = { id:number; x:number; y:number; z:number; roll:number };
export type ScoreBreakdown = { shotsMade:number; totalPoints:number; classifiedShots:number; overflowShots:number; wrongGoalShots:number };
export type ScoreEvent = { shotId:number; goal:AllianceColor; result:"classified"|"overflow"|"wrongGoal"; points:number };

export type DecodeRuleViolation = {
  code:"FIELD_BOUNDARY"|"ROBOT_BOUNDS"|"CONTROL_LIMIT"|"ARTIFACT_CONTROL";
  severity:"warning"|"major";
  message:string;
  time:number;
};

export type DecodeTelemetryMetrics = {
  phase:"autonomous"|"teleop";
  autonomousScoringTotal:number;
  teleOpScoringTotal:number;
  artifactCount:{
    preloaded:number;
    collected:number;
    stored:number;
    fired:number;
    controlled:number;
  };
  shotSuccessRate:{
    successful:number;
    attempted:number;
    percent:number;
  };
  flywheelEfficiency:{
    targetRpm:number;
    actualRpm:number;
    rpmError:number;
    percent:number;
  };
  robotVelocity:{
    linearSpeedInchesPerSecond:number;
    speedVariance:number;
    averageDrivePower:number;
  };
  ruleViolations:DecodeRuleViolation[];
};

export type TelemetryFrame = RobotState & {
  time:number;
  event?:string;
  warning?:string;
  shot?:ShotState;
  artifacts?:ArtifactPhysicsState[];
  shots?:ShotPhysicsState[];
  score?:ScoreBreakdown;
  scoreEvent?:ScoreEvent;
  decodeTelemetry?:DecodeTelemetryMetrics;
};

export type AIFeedback = { headline:string; status:"warning"|"complete"; happened:string; cause:string; evidence:string[]; fix:string; optimization:string; concept:string; nextTest?:string; summaryMarkdown?:string };

export type AIChatMessage = {
  id:string;
  role:"user"|"assistant";
  content:string;
  createdAt:number;
};

export type AnalyzeRobotSetup = {
  robotId:string;
  robotName:string;
  width:number;
  length:number;
  allianceColor:AllianceColor;
  coordinateSystem:CoordinateSystem;
  controlMode:ControlMode;
  startPose:{ x:number; y:number; heading:number };
  preloadCount:number;
  selectedArtifactRows:ArtifactRowId[];
};

export type AnalyzeRequest = {
  goal:string;
  code:string;
  robotSetup:AnalyzeRobotSetup;
  frames:TelemetryFrame[];
  messages?:AIChatMessage[];
  question?:string;
};

export type AnalyzeResponse = {
  feedback:AIFeedback;
  assistantMessage:AIChatMessage;
  mode:"mock"|"openai";
  openai:{
    id:string;
    object:"chat.completion";
    created:number;
    model:string;
    choices:Array<{
      index:number;
      message:{ role:"assistant"; content:string };
      finish_reason:"stop";
    }>;
  };
};
