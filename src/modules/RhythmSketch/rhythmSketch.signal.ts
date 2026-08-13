import type {
  RhythmSketchPoint,
} from "./rhythmSketch.interface";

const clamp = (
  value: number,
  min: number,
  max: number,
) => Math.max(min, Math.min(max, value));

export const sanitizeDrawingPoints = (
  points: RhythmSketchPoint[],
): RhythmSketchPoint[] =>
  (points ?? [])
    .filter(
      (point) =>
        Number.isFinite(point?.x) &&
        Number.isFinite(point?.y),
    )
    .map((point) => ({
      x: clamp(Number(point.x), 0, 1),
      y: clamp(Number(point.y), 0, 1),
    }));

export const drawingCoverage = (
  points: RhythmSketchPoint[],
) => {
  if (!points.length) return 0;

  const xs = points.map((point) => point.x);

  return Math.max(...xs) - Math.min(...xs);
};

const collapseByX = (
  points: RhythmSketchPoint[],
) => {
  const sorted = [...points].sort(
    (a, b) => a.x - b.x,
  );

  const collapsed: RhythmSketchPoint[] = [];

  for (const point of sorted) {
    const previous = collapsed[collapsed.length - 1];

    if (
      previous &&
      Math.abs(previous.x - point.x) < 0.001
    ) {
      previous.y = (previous.y + point.y) / 2;
      continue;
    }

    collapsed.push({ ...point });
  }

  return collapsed;
};

export const resampleDrawing = (
  points: RhythmSketchPoint[],
  samples = 256,
): number[] => {
  const collapsed = collapseByX(points);

  if (collapsed.length < 2) {
    return new Array(samples).fill(0);
  }

  const minX = collapsed[0].x;
  const maxX = collapsed[collapsed.length - 1].x;
  const width = Math.max(0.0001, maxX - minX);

  const result: number[] = [];
  let cursor = 0;

  for (let index = 0; index < samples; index += 1) {
    const target =
      minX + (index / Math.max(1, samples - 1)) * width;

    while (
      cursor < collapsed.length - 2 &&
      collapsed[cursor + 1].x < target
    ) {
      cursor += 1;
    }

    const left = collapsed[cursor];
    const right =
      collapsed[Math.min(cursor + 1, collapsed.length - 1)];

    const interval = Math.max(
      0.000001,
      right.x - left.x,
    );

    const ratio = clamp(
      (target - left.x) / interval,
      0,
      1,
    );

    const y =
      left.y + (right.y - left.y) * ratio;

    /*
     * SVG/canvas cresce para baixo. Invertemos o eixo para
     * que deflexões positivas do ECG sejam valores positivos.
     */
    result.push(0.5 - y);
  }

  return normalizeSignal(result);
};

export const referenceToSignal = (
  points: RhythmSketchPoint[],
) =>
  normalizeSignal(
    points.map((point) => 0.5 - point.y),
  );

export const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : 0;

export const standardDeviation = (
  values: number[],
) => {
  if (values.length < 2) return 0;

  const average = mean(values);
  const variance =
    values.reduce(
      (sum, value) =>
        sum + (value - average) ** 2,
      0,
    ) / values.length;

  return Math.sqrt(variance);
};

export const normalizeSignal = (
  values: number[],
) => {
  if (!values.length) return [];

  const sorted = [...values].sort(
    (a, b) => a - b,
  );

  const median =
    sorted[Math.floor(sorted.length / 2)] ?? 0;

  const centered = values.map(
    (value) => value - median,
  );

  const maxAbs =
    Math.max(
      ...centered.map((value) => Math.abs(value)),
      0.0001,
    ) || 1;

  return centered.map((value) => value / maxAbs);
};

export const smoothSignal = (
  values: number[],
  radius = 2,
) => {
  if (!values.length || radius <= 0) {
    return [...values];
  }

  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(
      values.length - 1,
      index + radius,
    );

    let sum = 0;
    let count = 0;

    for (let cursor = start; cursor <= end; cursor += 1) {
      sum += values[cursor];
      count += 1;
    }

    return count ? sum / count : values[index];
  });
};

export interface DetectedPeak {
  index: number;
  value: number;
  width: number;
}

export const detectDominantPeaks = (
  raw: number[],
  expectedMaxCycles = 8,
): DetectedPeak[] => {
  const signal = smoothSignal(raw, 2);

  if (signal.length < 5) return [];

  const maxValue = Math.max(...signal);
  const threshold = Math.max(0.32, maxValue * 0.48);

  const minimumDistance = Math.max(
    8,
    Math.floor(
      signal.length /
        Math.max(4, expectedMaxCycles * 1.55),
    ),
  );

  const candidates: DetectedPeak[] = [];

  for (
    let index = 2;
    index < signal.length - 2;
    index += 1
  ) {
    const current = signal[index];

    if (current < threshold) continue;

    if (
      current < signal[index - 1] ||
      current < signal[index + 1]
    ) {
      continue;
    }

    const half = current * 0.5;

    let left = index;
    let right = index;

    while (
      left > 0 &&
      signal[left] > half
    ) {
      left -= 1;
    }

    while (
      right < signal.length - 1 &&
      signal[right] > half
    ) {
      right += 1;
    }

    candidates.push({
      index,
      value: current,
      width: Math.max(1, right - left),
    });
  }

  /*
   * Non-maximum suppression: pega primeiro os maiores picos e
   * impede que um único QRS seja contado várias vezes.
   */
  const selected: DetectedPeak[] = [];

  for (const candidate of [...candidates].sort(
    (a, b) => b.value - a.value,
  )) {
    const tooClose = selected.some(
      (peak) =>
        Math.abs(peak.index - candidate.index) <
        minimumDistance,
    );

    if (!tooClose) {
      selected.push(candidate);
    }
  }

  return selected.sort(
    (a, b) => a.index - b.index,
  );
};

export const regularityCvFromPeaks = (
  peaks: DetectedPeak[],
) => {
  if (peaks.length < 3) return 0;

  const rr: number[] = [];

  for (let index = 1; index < peaks.length; index += 1) {
    rr.push(
      peaks[index].index - peaks[index - 1].index,
    );
  }

  const average = mean(rr);

  if (average <= 0) return 0;

  return standardDeviation(rr) / average;
};

export const averagePeakWidth = (
  peaks: DetectedPeak[],
  sampleCount: number,
) => {
  if (!peaks.length || sampleCount <= 0) return 0;

  return (
    mean(peaks.map((peak) => peak.width)) /
    sampleCount
  );
};

export const signalAmplitude = (
  signal: number[],
) => {
  if (!signal.length) return 0;

  return Math.max(...signal) - Math.min(...signal);
};

export const dtwDistance = (
  a: number[],
  b: number[],
) => {
  if (!a.length || !b.length) return 1;

  const previous = new Array<number>(
    b.length + 1,
  ).fill(Number.POSITIVE_INFINITY);

  const current = new Array<number>(
    b.length + 1,
  ).fill(Number.POSITIVE_INFINITY);

  previous[0] = 0;

  for (let i = 1; i <= a.length; i += 1) {
    current.fill(Number.POSITIVE_INFINITY);
    current[0] = Number.POSITIVE_INFINITY;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = Math.abs(a[i - 1] - b[j - 1]);

      current[j] =
        cost +
        Math.min(
          current[j - 1],
          previous[j],
          previous[j - 1],
        );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length] /
    Math.max(a.length, b.length);
};

export const correlation = (
  a: number[],
  b: number[],
) => {
  const length = Math.min(a.length, b.length);

  if (length < 2) return 0;

  const left = a.slice(0, length);
  const right = b.slice(0, length);

  const meanA = mean(left);
  const meanB = mean(right);

  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;

  for (let index = 0; index < length; index += 1) {
    const deltaA = left[index] - meanA;
    const deltaB = right[index] - meanB;

    numerator += deltaA * deltaB;
    denominatorA += deltaA ** 2;
    denominatorB += deltaB ** 2;
  }

  const denominator = Math.sqrt(
    denominatorA * denominatorB,
  );

  if (!denominator) return 0;

  return clamp(numerator / denominator, -1, 1);
};

const resampleArray = (
  values: number[],
  samples: number,
) => {
  if (!values.length) return new Array(samples).fill(0);
  if (values.length === 1) {
    return new Array(samples).fill(values[0]);
  }

  const result: number[] = [];

  for (let index = 0; index < samples; index += 1) {
    const position =
      (index / Math.max(1, samples - 1)) *
      (values.length - 1);

    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(
      values.length - 1,
      leftIndex + 1,
    );

    const ratio = position - leftIndex;

    result.push(
      values[leftIndex] +
        (values[rightIndex] - values[leftIndex]) *
          ratio,
    );
  }

  return normalizeSignal(result);
};

export const beatConsistencyScore = (
  signal: number[],
  peaks: DetectedPeak[],
) => {
  if (peaks.length < 3) return 55;

  const segments: number[][] = [];

  const rr =
    peaks.length > 1
      ? mean(
          peaks
            .slice(1)
            .map(
              (peak, index) =>
                peak.index - peaks[index].index,
            ),
        )
      : signal.length / 5;

  const before = Math.max(8, Math.floor(rr * 0.35));
  const after = Math.max(12, Math.floor(rr * 0.45));

  for (const peak of peaks) {
    const start = Math.max(0, peak.index - before);
    const end = Math.min(
      signal.length,
      peak.index + after,
    );

    if (end - start < 10) continue;

    segments.push(
      resampleArray(signal.slice(start, end), 64),
    );
  }

  if (segments.length < 2) return 55;

  const correlations: number[] = [];

  for (let index = 1; index < segments.length; index += 1) {
    correlations.push(
      Math.max(
        0,
        correlation(
          segments[index - 1],
          segments[index],
        ),
      ),
    );
  }

  return clamp(
    mean(correlations) * 100,
    0,
    100,
  );
};

export const clampScore = (value: number) =>
  Math.round(clamp(value, 0, 100));
