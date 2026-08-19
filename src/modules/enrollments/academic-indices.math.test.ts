import assert from "node:assert/strict";
import test from "node:test";
import { normalizedCompletionAverage, sampleStatistics, weightedAverage } from "./academic-indices.math";

test("MC pondera a nota pela carga horária", () => {
  assert.equal(weightedAverage([{ score: 80, weight: 2 }, { score: 100, weight: 1 }]), 260 / 3);
});

test("desvio padrão é amostral e MCN segue a Resolução 11/2024", () => {
  const stats = sampleStatistics([70, 80, 90]);
  assert.equal(stats.mean, 80);
  assert.equal(stats.sampleStandardDeviation, 10);
  assert.equal(normalizedCompletionAverage(90, stats.mean, stats.sampleStandardDeviation), 600);
});

test("MCN não é inventada sem amostra válida", () => {
  assert.equal(normalizedCompletionAverage(90, 90, null), null);
  assert.equal(normalizedCompletionAverage(90, 90, 0), null);
});
