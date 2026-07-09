export type RobotPresetId = "turret";

export type RobotPreset = {
  id: RobotPresetId;
  name: string;
  description: string;
  width: number;
  length: number;
  accent: string;
};

export const robotPresets: RobotPreset[] = [
  {
    id: "turret",
    name: "Turret Shooter",
    description: "Mecanum - continuous intake - indexed feeder - adjustable hood",
    width: 17,
    length: 17,
    accent: "cyan",
  },
];
