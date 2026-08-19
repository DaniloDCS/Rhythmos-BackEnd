import type {
  RhythmSketchRhythmId,
  RhythmSketchRule,
} from "./rhythm-sketch.types";

export const RHYTHM_SKETCH_RULES: Record<
  RhythmSketchRhythmId,
  RhythmSketchRule
> = {
  sinus_normal: {
    id: "sinus_normal",
    name: "Ritmo sinusal normal",
    lead: "DII",
    minCycles: 4,
    durationSeconds: 4,
    expectedCycles: {
      min: 4,
      max: 6,
      ideal: 5,
    },
    regularity: "regular",
    pWave: "present",
    qrs: "narrow",
    rateLabel: "normal",
    instructions: [
      "Represente pelo menos 4 ciclos cardíacos.",
      "Mantenha regularidade entre os intervalos RR.",
      "Em DII, represente P antes de cada QRS e onda T após o complexo.",
    ],
  },

  sinus_bradycardia: {
    id: "sinus_bradycardia",
    name: "Bradicardia sinusal",
    lead: "DII",
    minCycles: 4,
    durationSeconds: 6,
    expectedCycles: {
      min: 4,
      max: 5,
      ideal: 4,
    },
    regularity: "regular",
    pWave: "present",
    qrs: "narrow",
    rateLabel: "slow",
    instructions: [
      "Represente pelo menos 4 ciclos cardíacos.",
      "Use intervalos RR regulares e mais espaçados.",
      "Mantenha P antes de cada QRS e T após o complexo.",
    ],
  },

  sinus_tachycardia: {
    id: "sinus_tachycardia",
    name: "Taquicardia sinusal",
    lead: "DII",
    minCycles: 4,
    durationSeconds: 3,
    expectedCycles: {
      min: 5,
      max: 8,
      ideal: 6,
    },
    regularity: "regular",
    pWave: "present",
    qrs: "narrow",
    rateLabel: "fast",
    instructions: [
      "Represente pelo menos 4 ciclos cardíacos.",
      "Comprima os intervalos RR mantendo regularidade.",
      "Mantenha P antes de cada QRS e T após o complexo.",
    ],
  },

  atrial_fibrillation: {
    id: "atrial_fibrillation",
    name: "Fibrilação atrial",
    lead: "DII",
    minCycles: 4,
    durationSeconds: 4,
    expectedCycles: {
      min: 4,
      max: 8,
      ideal: 6,
    },
    regularity: "irregularly_irregular",
    pWave: "absent",
    qrs: "narrow",
    rateLabel: "normal",
    instructions: [
      "Represente pelo menos 4 complexos QRS.",
      "Não desenhe ondas P organizadas antes de cada QRS.",
      "Faça os intervalos RR irregularmente irregulares.",
      "Pode representar pequenas oscilações na linha de base.",
    ],
  },

  ventricular_tachycardia: {
    id: "ventricular_tachycardia",
    name: "Taquicardia ventricular",
    lead: "DII",
    minCycles: 4,
    durationSeconds: 3,
    expectedCycles: {
      min: 4,
      max: 7,
      ideal: 5,
    },
    regularity: "regular",
    pWave: "absent",
    qrs: "wide",
    rateLabel: "fast",
    instructions: [
      "Represente pelo menos 4 complexos ventriculares.",
      "Os complexos devem ser largos e sucessivos.",
      "Mantenha ritmo predominantemente regular.",
      "Não é necessário representar onda P organizada.",
    ],
  },
};

export const RHYTHM_SKETCH_IDS = Object.keys(
  RHYTHM_SKETCH_RULES,
) as RhythmSketchRhythmId[];
