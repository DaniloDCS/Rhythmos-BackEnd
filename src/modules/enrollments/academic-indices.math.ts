export const weightedAverage = (items: Array<{ score: number; weight: number }>) => {
  const valid = items.filter((item) => Number.isFinite(item.score) && Number.isFinite(item.weight) && item.weight > 0);
  const weight = valid.reduce((sum, item) => sum + item.weight, 0);
  return weight > 0 ? valid.reduce((sum, item) => sum + item.score * item.weight, 0) / weight : null;
};

export const sampleStatistics = (values: number[]) => {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return { mean: null, sampleStandardDeviation: null };
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  if (valid.length < 2) return { mean, sampleStandardDeviation: null };
  const sampleStandardDeviation = Math.sqrt(valid.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (valid.length - 1));
  return { mean, sampleStandardDeviation };
};

export const normalizedCompletionAverage = (mc: number | null, mean: number | null, deviation: number | null) =>
  mc !== null && mean !== null && deviation !== null && deviation > 0 ? 500 + 100 * ((mc - mean) / deviation) : null;

