import type {
  RhythmSketchFeedbackItem,
  RhythmSketchPoint,
  RhythmSketchRule,
  RhythmSketchValidationResult,
} from "./rhythmSketch.interface";
import { buildRhythmReference } from "./rhythmSketch.templates";
import {
  averagePeakWidth,
  beatConsistencyScore,
  clampScore,
  detectDominantPeaks,
  drawingCoverage,
  dtwDistance,
  referenceToSignal,
  regularityCvFromPeaks,
  resampleDrawing,
  sanitizeDrawingPoints,
  signalAmplitude,
} from "./rhythmSketch.signal";

const SAMPLE_COUNT = 256;
const PASS_SCORE = 70;
const PERFECT_SCORE = 92;
const MIN_COVERAGE = 0.78;
const MIN_POINTS = 70;

const scoreCycleCount = (
  detected: number,
  rule: RhythmSketchRule,
) => {
  if (detected <= 0) return 0;

  if (
    detected >= rule.expectedCycles.min &&
    detected <= rule.expectedCycles.max
  ) {
    const distance = Math.abs(
      detected - rule.expectedCycles.ideal,
    );

    return clampScore(100 - distance * 7);
  }

  const distance =
    detected < rule.expectedCycles.min
      ? rule.expectedCycles.min - detected
      : detected - rule.expectedCycles.max;

  return clampScore(65 - distance * 22);
};

const scoreRegularity = (
  cv: number,
  rule: RhythmSketchRule,
) => {
  if (rule.regularity === "regular") {
    if (cv <= 0.08) return 100;
    if (cv <= 0.14) return 90;
    if (cv <= 0.2) return 72;
    if (cv <= 0.28) return 52;

    return 25;
  }

  /*
   * Para fibrilação atrial, procuramos variabilidade real entre RR.
   * Não tentamos diagnosticar FA apenas por esse valor; ele é uma das
   * dimensões pedagógicas do jogo.
   */
  if (cv >= 0.18 && cv <= 0.5) return 100;
  if (cv >= 0.13) return 82;
  if (cv >= 0.09) return 62;

  return 30;
};

const scoreQrsWidth = (
  userWidth: number,
  referenceWidth: number,
) => {
  if (
    userWidth <= 0 ||
    referenceWidth <= 0
  ) {
    return 45;
  }

  const ratio =
    Math.min(userWidth, referenceWidth) /
    Math.max(userWidth, referenceWidth);

  return clampScore(ratio * 100);
};

const morphologyScore = (
  userSignal: number[],
  referenceSignal: number[],
) => {
  const distance = dtwDistance(
    userSignal,
    referenceSignal,
  );

  /*
   * DTW perfeito = 0.
   * A exponencial deixa pequenas diferenças de desenho toleráveis,
   * mas reduz rápido quando a morfologia se afasta bastante.
   */
  return clampScore(
    100 * Math.exp(-2.15 * distance),
  );
};

const buildFeedback = (
  rule: RhythmSketchRule,
  score: number,
  breakdown: RhythmSketchValidationResult["breakdown"],
  features: RhythmSketchValidationResult["features"],
): RhythmSketchFeedbackItem[] => {
  const feedback: RhythmSketchFeedbackItem[] = [];

  if (features.coverage < MIN_COVERAGE) {
    feedback.push({
      type: "error",
      label: "Use mais da faixa",
      detail:
        "Desenhe o ritmo da esquerda até próximo da borda direita do papel.",
    });
  }

  if (features.detectedCycles < rule.minCycles) {
    feedback.push({
      type: "error",
      label: "Poucos ciclos",
      detail: `Foram identificados ${features.detectedCycles}. Desenhe pelo menos ${rule.minCycles} ciclos/complexos.`,
    });
  } else {
    feedback.push({
      type: "success",
      label: "Quantidade de ciclos",
      detail: `${features.detectedCycles} ciclos/complexos foram identificados.`,
    });
  }

  if (breakdown.timing >= 78) {
    feedback.push({
      type: "success",
      label:
        rule.regularity === "regular"
          ? "Regularidade adequada"
          : "Irregularidade compatível",
      detail:
        rule.regularity === "regular"
          ? "Os intervalos entre os complexos ficaram consistentes."
          : "Os intervalos RR apresentaram variabilidade compatível com o desafio.",
    });
  } else {
    feedback.push({
      type: "warning",
      label: "Revise os intervalos RR",
      detail:
        rule.regularity === "regular"
          ? "O ritmo esperado é predominantemente regular."
          : "A fibrilação atrial deve apresentar RR irregularmente irregulares.",
    });
  }

  if (breakdown.structure >= 75) {
    feedback.push({
      type: "success",
      label: "Estrutura reconhecível",
      detail:
        rule.qrs === "wide"
          ? "A largura e a repetição dos complexos ficaram próximas do padrão esperado."
          : "Os complexos principais ficaram compatíveis com o padrão esperado.",
    });
  } else {
    feedback.push({
      type: "warning",
      label: "Revise a estrutura",
      detail:
        rule.qrs === "wide"
          ? "Nesse ritmo, represente complexos ventriculares mais largos e bem definidos."
          : "Tente deixar os QRS mais definidos e manter a sequência morfológica do ritmo.",
    });
  }

  if (breakdown.morphology >= 78) {
    feedback.push({
      type: "success",
      label: "Boa morfologia global",
      detail:
        "O desenho apresentou boa similaridade com o padrão de referência.",
    });
  } else if (breakdown.morphology >= 58) {
    feedback.push({
      type: "warning",
      label: "Morfologia parcialmente compatível",
      detail:
        "A ideia do ritmo aparece no desenho, mas algumas deflexões podem ser melhor definidas.",
    });
  } else {
    feedback.push({
      type: "error",
      label: "Morfologia distante do padrão",
      detail:
        "Compare seu traçado com a referência sobreposta e tente novamente.",
    });
  }

  if (rule.pWave === "present") {
    feedback.push({
      type:
        breakdown.morphology >= 70
          ? "info"
          : "warning",
      label: "Ondas P",
      detail:
        "Em ritmos sinusais, mantenha pequenas ondas P positivas em DII antes de cada QRS.",
    });
  } else if (rule.id === "atrial_fibrillation") {
    feedback.push({
      type: "info",
      label: "Atividade atrial",
      detail:
        "Evite ondas P organizadas e repetitivas antes de cada QRS.",
    });
  }

  if (score >= PASS_SCORE) {
    feedback.unshift({
      type: "success",
      label: "Ritmo aprovado",
      detail: `Pontuação final: ${score}%.`,
    });
  }

  return feedback.slice(0, 6);
};

export const validateRhythmSketch = (
  rawPoints: RhythmSketchPoint[],
  rule: RhythmSketchRule,
): RhythmSketchValidationResult => {
  const points = sanitizeDrawingPoints(rawPoints);
  const coverage = drawingCoverage(points);

  const referencePoints = buildRhythmReference(
    rule.id,
    SAMPLE_COUNT,
  );

  const userSignal = resampleDrawing(
    points,
    SAMPLE_COUNT,
  );

  const referenceSignal =
    referenceToSignal(referencePoints);

  const userPeaks = detectDominantPeaks(
    userSignal,
    rule.expectedCycles.max,
  );

  const referencePeaks = detectDominantPeaks(
    referenceSignal,
    rule.expectedCycles.max,
  );

  const detectedCycles = userPeaks.length;
  const regularityCv =
    regularityCvFromPeaks(userPeaks);

  const userPeakWidth = averagePeakWidth(
    userPeaks,
    SAMPLE_COUNT,
  );

  const referencePeakWidth = averagePeakWidth(
    referencePeaks,
    SAMPLE_COUNT,
  );

  const cycleScore = scoreCycleCount(
    detectedCycles,
    rule,
  );

  const widthScore = scoreQrsWidth(
    userPeakWidth,
    referencePeakWidth,
  );

  const structure = clampScore(
    cycleScore * 0.72 +
      widthScore * 0.28,
  );

  const timing = clampScore(
    scoreRegularity(regularityCv, rule) * 0.72 +
      cycleScore * 0.28,
  );

  const morphology = morphologyScore(
    userSignal,
    referenceSignal,
  );

  const beatConsistency = beatConsistencyScore(
    userSignal,
    userPeaks,
  );

  const consistency = clampScore(
    rule.regularity === "regular"
      ? beatConsistency * 0.72 +
          scoreRegularity(regularityCv, rule) * 0.28
      : beatConsistency * 0.58 +
          scoreRegularity(regularityCv, rule) * 0.42,
  );

  const breakdown = {
    structure,
    timing,
    morphology,
    consistency,
  };

  let score = clampScore(
    structure * 0.4 +
      timing * 0.25 +
      morphology * 0.25 +
      consistency * 0.1,
  );

  /*
   * Guardas mínimas. Impedem que um rabisco curto obtenha nota alta
   * apenas por alguma coincidência morfológica.
   */
  if (
    points.length < MIN_POINTS ||
    coverage < MIN_COVERAGE
  ) {
    score = Math.min(score, 55);
  }

  if (detectedCycles < rule.minCycles) {
    score = Math.min(score, 64);
  }

  const features = {
    coverage: Number(coverage.toFixed(3)),
    samples: points.length,
    detectedCycles,
    expectedCycles: rule.expectedCycles.ideal,
    regularityCv: Number(
      regularityCv.toFixed(3),
    ),
    dominantPeakCount: userPeaks.length,
    amplitude: Number(
      signalAmplitude(userSignal).toFixed(3),
    ),
  };

  const passed =
    score >= PASS_SCORE &&
    coverage >= MIN_COVERAGE &&
    points.length >= MIN_POINTS &&
    detectedCycles >= rule.minCycles;

  const perfect =
    passed && score >= PERFECT_SCORE;

  return {
    score,
    passed,
    perfect,
    breakdown,
    features,
    feedback: buildFeedback(
      rule,
      score,
      breakdown,
      features,
    ),
    referencePoints,
  };
};
