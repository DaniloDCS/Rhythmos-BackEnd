type regularity = "regular" | "irregular";

export type IRhythm = {
  name: string;
  frequency: string;
  frequencyIsRegular: boolean;
  regularityRhythm: regularity;
  origin: string;
  description: string;
  dangerous: boolean;
  rhythm: string;
  pattern?: string;
  pWave?: string;
  avRelation?: string;
  qrs?: string;
  intervals?: string;
  conduction?: string;
  responseToStimulus?: string;
  symptoms?: string;
  context?: string;
  abbreviation: string;
};
