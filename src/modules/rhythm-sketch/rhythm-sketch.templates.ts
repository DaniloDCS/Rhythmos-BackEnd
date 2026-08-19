import type {
  RhythmSketchPoint,
  RhythmSketchRhythmId,
} from "./rhythm-sketch.types";

const gaussian = (
  x: number,
  center: number,
  width: number,
  amplitude: number,
) => {
  const distance = (x - center) / width;
  return amplitude * Math.exp(-0.5 * distance * distance);
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const toNormalizedPoints = (signal: number[]): RhythmSketchPoint[] => {
  const maxAbs = Math.max(...signal.map((value) => Math.abs(value)), 1) || 1;

  return signal.map((value, index) => ({
    x: index / Math.max(1, signal.length - 1),
    y: clamp01(0.5 - (value / maxAbs) * 0.38),
  }));
};

const makeSinusSignal = (
  samples: number,
  beatCenters: number[],
  options?: {
    pAmplitude?: number;
    tAmplitude?: number;
    qrsScale?: number;
    baselineWave?: boolean;
  },
) => {
  const signal = new Array<number>(samples).fill(0);
  const pAmplitude = options?.pAmplitude ?? 0.18;
  const tAmplitude = options?.tAmplitude ?? 0.28;
  const qrsScale = options?.qrsScale ?? 1;

  for (let index = 0; index < samples; index += 1) {
    const x = index / Math.max(1, samples - 1);

    let value = 0;

    if (options?.baselineWave) {
      value +=
        Math.sin(x * Math.PI * 30) * 0.035 + Math.sin(x * Math.PI * 47) * 0.018;
    }

    for (const beat of beatCenters) {
      value += gaussian(x, beat - 0.085, 0.016, pAmplitude);
      value += gaussian(x, beat - 0.017, 0.006, -0.14 * qrsScale);
      value += gaussian(x, beat, 0.008, 1 * qrsScale);
      value += gaussian(x, beat + 0.018, 0.008, -0.28 * qrsScale);
      value += gaussian(x, beat + 0.095, 0.027, tAmplitude);
    }

    signal[index] = value;
  }

  return signal;
};

const makeAtrialFibrillationSignal = (samples: number) => {
  const beatCenters = [0.1, 0.25, 0.47, 0.59, 0.81, 0.94];
  const signal = new Array<number>(samples).fill(0);

  for (let index = 0; index < samples; index += 1) {
    const x = index / Math.max(1, samples - 1);

    let value =
      Math.sin(x * Math.PI * 36) * 0.05 +
      Math.sin(x * Math.PI * 53 + 0.7) * 0.025 +
      Math.sin(x * Math.PI * 21 + 1.4) * 0.018;

    for (const beat of beatCenters) {
      value += gaussian(x, beat - 0.015, 0.006, -0.12);
      value += gaussian(x, beat, 0.008, 0.95);
      value += gaussian(x, beat + 0.018, 0.008, -0.26);
      value += gaussian(x, beat + 0.088, 0.025, 0.22);
    }

    signal[index] = value;
  }

  return signal;
};

const makeVentricularTachycardiaSignal = (samples: number) => {
  const beatCenters = [0.12, 0.31, 0.5, 0.69, 0.88];
  const signal = new Array<number>(samples).fill(0);

  for (let index = 0; index < samples; index += 1) {
    const x = index / Math.max(1, samples - 1);
    let value = 0;

    for (const beat of beatCenters) {
      value += gaussian(x, beat - 0.025, 0.018, -0.35);
      value += gaussian(x, beat, 0.035, 0.92);
      value += gaussian(x, beat + 0.047, 0.028, -0.68);
      value += gaussian(x, beat + 0.09, 0.035, 0.2);
    }

    signal[index] = value;
  }

  return signal;
};

export const buildRhythmReference = (
  rhythmId: RhythmSketchRhythmId,
  samples = 512,
): RhythmSketchPoint[] => {
  switch (rhythmId) {
    case "sinus_normal":
      return toNormalizedPoints(
        makeSinusSignal(samples, [0.1, 0.3, 0.5, 0.7, 0.9]),
      );

    case "sinus_bradycardia":
      return toNormalizedPoints(
        makeSinusSignal(samples, [0.13, 0.38, 0.63, 0.88], {
          pAmplitude: 0.2,
          tAmplitude: 0.3,
        }),
      );

    case "sinus_tachycardia":
      return toNormalizedPoints(
        makeSinusSignal(samples, [0.08, 0.245, 0.41, 0.575, 0.74, 0.905], {
          pAmplitude: 0.16,
          tAmplitude: 0.23,
        }),
      );

    case "atrial_fibrillation":
      return toNormalizedPoints(makeAtrialFibrillationSignal(samples));

    case "ventricular_tachycardia":
      return toNormalizedPoints(makeVentricularTachycardiaSignal(samples));
  }
};
