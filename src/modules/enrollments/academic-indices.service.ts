import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { IEnrollment } from "./enrollment.types";
import { normalizedCompletionAverage, sampleStatistics, weightedAverage } from "./academic-indices.math";

type Dated = Timestamp | Date | { seconds?: number; _seconds?: number } | undefined;

export interface AcademicComponentResult {
  moduleId: string;
  title: string;
  workloadHours: number;
  assessmentId?: string;
  score?: number;
  attempts: number;
  passed: boolean;
  passedAt?: unknown;
  performedAt?: unknown;
}

export interface AcademicIndices {
  methodologyVersion: "rhythmos-2026.1";
  calculatedAt: string;
  completionAverage: number | null;
  normalizedCompletionAverage: number | null;
  cohortMean: number | null;
  cohortSampleStandardDeviation: number | null;
  cohortSize: number;
  workloadEfficiencyIndex: number;
  periodEfficiencyIndex: number;
  academicEfficiencyIndex: number | null;
  normalizedAcademicEfficiencyIndex: number | null;
  approvedWorkloadHours: number;
  attemptedWorkloadHours: number;
  minimumWorkloadHours: number;
  elapsedPeriods: number;
  standardDurationPeriods: number;
  components: AcademicComponentResult[];
  notes: string[];
}

const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const date = (value: Dated) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  const seconds = value.seconds ?? value._seconds;
  return typeof seconds === "number" ? new Date(seconds * 1000) : undefined;
};

const round = (value: number, digits = 2) =>
  Number(value.toFixed(digits));

const moduleHours = (module: Record<string, unknown>, lessonMinutes: number) => {
  const configured = number(module.workloadHours);
  if (configured > 0) return configured;
  const estimated = number(module.estimatedMinutes);
  if (estimated > 0) return estimated / 60;
  return lessonMinutes > 0 ? lessonMinutes / 60 : 1;
};

const bestPassedAttempts = (attempts: Record<string, unknown>[]) => {
  const byAssessment = new Map<string, Record<string, unknown>>();
  for (const attempt of attempts) {
    if (attempt.passed !== true) continue;
    const id = String(attempt.assessmentId ?? "");
    if (!id) continue;
    const current = byAssessment.get(id);
    if (!current || number(attempt.score) > number(current.score)) {
      byAssessment.set(id, attempt);
    }
  }
  return byAssessment;
};

const rawCompletionAverage = (
  modules: Record<string, unknown>[],
  attempts: Record<string, unknown>[],
  hours: Map<string, number>,
) => {
  const best = bestPassedAttempts(attempts);
  const results: Array<{ score: number; weight: number }> = [];
  for (const module of modules) {
    const assessmentId = String(module.finalAssessmentId ?? "");
    const attempt = best.get(assessmentId);
    if (!attempt) continue;
    const workload = hours.get(String(module.id)) ?? 1;
    results.push({ score: number(attempt.score), weight: workload });
  }
  return weightedAverage(results);
};

export class AcademicIndicesService {
  static async calculate(enrollment: IEnrollment & { id: string }): Promise<AcademicIndices> {
    const [trailDoc, modulesSnapshot, lessonsSnapshot, attemptsSnapshot] = await Promise.all([
      db.collection("trails").doc(enrollment.trailId).get(),
      db.collection("modules").where("trailId", "==", enrollment.trailId).get(),
      db.collection("lessons").where("trailId", "==", enrollment.trailId).get(),
      db.collection("assessment_attempts").where("enrollmentId", "==", enrollment.id).get(),
    ]);
    const trail = (trailDoc.data() ?? {}) as Record<string, unknown>;
    const modules: Record<string, unknown>[] = modulesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>))
      .filter((module) => module.archived !== true)
      .sort((a, b) => number(a.sequence) - number(b.sequence));
    const lessonMinutes = new Map<string, number>();
    for (const doc of lessonsSnapshot.docs) {
      const lesson = doc.data();
      const moduleId = String(lesson.moduleId ?? "");
      const version = (lesson.version ?? {}) as Record<string, unknown>;
      const minutes = number(lesson.durationInMinutes ?? version.durationInMinutes ?? version.estimatedMinutes);
      lessonMinutes.set(moduleId, (lessonMinutes.get(moduleId) ?? 0) + minutes);
    }
    const hours = new Map(modules.map((module) => [String(module.id), moduleHours(module, lessonMinutes.get(String(module.id)) ?? 0)]));
    const attempts: Record<string, unknown>[] = attemptsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const best = bestPassedAttempts(attempts);
    const components: AcademicComponentResult[] = modules.map((module) => {
      const assessmentId = String(module.finalAssessmentId ?? "");
      const relevant = attempts.filter((attempt) => attempt.assessmentId === assessmentId);
      const passed = best.get(assessmentId);
      const latest = [...relevant].sort((a, b) =>
        (date(b.completedAt as Dated)?.getTime() ?? date(b.createdAt as Dated)?.getTime() ?? 0) -
        (date(a.completedAt as Dated)?.getTime() ?? date(a.createdAt as Dated)?.getTime() ?? 0),
      )[0];
      const finalAttempt = passed ?? latest;
      return {
        moduleId: String(module.id), title: String(module.title ?? "Módulo"),
        workloadHours: round(hours.get(String(module.id)) ?? 1),
        ...(assessmentId ? { assessmentId } : {}),
        ...(finalAttempt ? { score: number(finalAttempt.score), performedAt: finalAttempt.completedAt ?? finalAttempt.createdAt } : {}),
        ...(passed ? { passedAt: passed.completedAt ?? passed.createdAt } : {}),
        attempts: relevant.length, passed: Boolean(passed),
      };
    });
    const completionAverage = rawCompletionAverage(modules, attempts, hours);
    const approvedWorkloadHours = components.filter((item) => item.passed).reduce((sum, item) => sum + item.workloadHours, 0);
    const attemptedWorkloadHours = components.filter((item) => item.attempts > 0 || item.passed).reduce((sum, item) => sum + item.workloadHours, 0);
    const minimumWorkloadHours = number(trail.workloadHours) || components.reduce((sum, item) => sum + item.workloadHours, 0);
    const workloadEfficiencyIndex = attemptedWorkloadHours > 0 ? approvedWorkloadHours / attemptedWorkloadHours : 0;
    const startedAt = date(enrollment.startedAt);
    const referenceAt = date(enrollment.completedAt) ?? new Date();
    const elapsedMonths = startedAt ? Math.max(1, (referenceAt.getTime() - startedAt.getTime()) / 2_629_746_000) : 1;
    const elapsedPeriods = Math.max(1, Math.ceil(elapsedMonths / 6));
    const standardDurationPeriods = Math.max(1, number(trail.standardDurationPeriods, modules.length || 1));
    const expectedHours = elapsedPeriods * (minimumWorkloadHours / standardDurationPeriods);
    const periodEfficiencyIndex = expectedHours > 0 ? approvedWorkloadHours / expectedHours : 0;

    const cutoff = Timestamp.fromDate(new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000));
    const cohortSnapshot = await db.collection("enrollments").where("trailId", "==", enrollment.trailId).where("status", "==", "concluido").get();
    const cohortEnrollments = cohortSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as IEnrollment & { id: string }))
      .filter((item) => (date(item.completedAt)?.getTime() ?? 0) >= cutoff.toDate().getTime());
    const cohortAttemptsSnapshot = await db.collection("assessment_attempts").where("trailId", "==", enrollment.trailId).get();
    const cohortAttempts = cohortAttemptsSnapshot.docs.map((doc) => doc.data());
    const cohortValues = cohortEnrollments.map((item) => rawCompletionAverage(modules, cohortAttempts.filter((attempt) => attempt.enrollmentId === item.id), hours)).filter((value): value is number => value !== null);
    const { mean: cohortMean, sampleStandardDeviation: deviation } = sampleStatistics(cohortValues);
    const normalized = normalizedCompletionAverage(completionAverage, cohortMean, deviation);
    const iea = completionAverage === null ? null : completionAverage * workloadEfficiencyIndex * periodEfficiencyIndex;
    const iean = normalized === null ? null : normalized * workloadEfficiencyIndex * periodEfficiencyIndex;
    return {
      methodologyVersion: "rhythmos-2026.1", calculatedAt: new Date().toISOString(),
      completionAverage: completionAverage === null ? null : round(completionAverage),
      normalizedCompletionAverage: normalized === null ? null : round(normalized),
      cohortMean: cohortMean === null ? null : round(cohortMean),
      cohortSampleStandardDeviation: deviation === null ? null : round(deviation), cohortSize: cohortValues.length,
      workloadEfficiencyIndex: round(workloadEfficiencyIndex, 4), periodEfficiencyIndex: round(periodEfficiencyIndex, 4),
      academicEfficiencyIndex: iea === null ? null : round(iea), normalizedAcademicEfficiencyIndex: iean === null ? null : round(iean),
      approvedWorkloadHours: round(approvedWorkloadHours), attemptedWorkloadHours: round(attemptedWorkloadHours), minimumWorkloadHours: round(minimumWorkloadHours),
      elapsedPeriods, standardDurationPeriods, components,
      notes: [
        "Cada módulo com avaliação final numérica é tratado como componente curricular.",
        "A MC usa a melhor tentativa aprovada, ponderada pela carga horária do módulo.",
        "A MCN só é exibida quando há ao menos dois concluintes e desvio padrão amostral maior que zero.",
        "Um período corresponde a seis meses; a duração padrão usa a configuração da trilha ou, na ausência, sua quantidade de módulos.",
      ],
    };
  }
}
