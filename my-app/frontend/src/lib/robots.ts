export type RobotPresetId = "launcher" | "arm" | "intake";

export type RobotPreset = {
  id: RobotPresetId;
  name: string;
  description: string;
  width: number;
  length: number;
  accent: string;
};

export const robotPresets: RobotPreset[] = [
  { id:"launcher", name:"RL-01 Launcher", description:"Mecanum drive · flywheel launcher", width:18, length:18, accent:"cyan" },
  { id:"arm", name:"RL-02 Arm", description:"Mecanum drive · arm and claw", width:17, length:18, accent:"purple" },
  { id:"intake", name:"RL-03 Compact", description:"Tank drive · roller intake", width:16, length:17, accent:"green" },
];
