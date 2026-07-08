export type FieldSeason = {
  id: "decode" | "biobuzz";
  name: string;
  years: string;
  status: "available" | "coming-soon";
  releaseNote?: string;
};

export const fieldSeasons: FieldSeason[] = [
  { id: "decode", name: "DECODE", years: "2025–2026", status: "available" },
  { id: "biobuzz", name: "BIOBUZZ", years: "2026–2027", status: "coming-soon", releaseNote: "Game reveal September 12, 2026" },
];
