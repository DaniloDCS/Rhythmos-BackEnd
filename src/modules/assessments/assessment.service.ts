import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import {
  Assessment,
  type IAssessment,
  type IAssessmentQuestion,
} from "./assessment.model";
import { LearningFlowService } from "../enrollments/learning-flow.service";
import { GamificationService } from "../gamification/gamification.service";

const ASSESSMENTS = "assessments";
const ATTEMPTS = "assessment_attempts";

export interface AssessmentAnswer {
  questionId: string;
  optionIds: string[];
}

const assessmentError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const sameSet = (a: string[], b: string[]) => {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
};

const sanitizeAnswers = (answers: unknown): AssessmentAnswer[] => {
  if (!Array.isArray(answers)) return [];
  return answers
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => ({
      questionId: String(item.questionId ?? "").trim(),
      optionIds: Array.isArray(item.optionIds)
        ? [
            ...new Set(
              item.optionIds
                .map(String)
                .map((id) => id.trim())
                .filter(Boolean),
            ),
          ]
        : [],
    }))
    .filter((item) => item.questionId);
};

export class AssessmentService {
  static async getById(id: string): Promise<Assessment> {
    const snapshot = await db.collection(ASSESSMENTS).doc(id).get();
    if (!snapshot.exists)
      throw assessmentError(404, "Avaliação não encontrada.");
    return Assessment.fromFirestore(snapshot.id, snapshot.data()!);
  }

  static async getPublicById(id: string) {
    const assessment = await this.getById(id);
    if (assessment.status !== "disponivel") {
      throw assessmentError(403, "Avaliação indisponível.");
    }
    return assessment.toPublicObject();
  }

  private static gradeQuestion(
    question: IAssessmentQuestion,
    selectedOptionIds: string[],
  ) {
    const allowed = new Set(question.options.map((option) => option.id));
    const selected = selectedOptionIds.filter((id) => allowed.has(id));
    const correctOptionIds = question.options
      .filter((option) => option.correct)
      .map((option) => option.id);
    const correct = sameSet(selected, correctOptionIds);
    return {
      questionId: question.id,
      correct,
      pointsEarned: correct ? question.points : 0,
      pointsAvailable: question.points,
      selectedOptionIds: selected,
      correctOptionIds,
      ...(question.explanation ? { explanation: question.explanation } : {}),
    };
  }

  static async submit(input: {
    assessmentId: string;
    userId: string;
    enrollmentId: string;
    answers: unknown;
  }) {
    const assessment = await this.getById(input.assessmentId);
    if (assessment.status !== "disponivel") {
      throw assessmentError(403, "Avaliação indisponível.");
    }

    const currentStep = await LearningFlowService.getCurrentStep(
      input.enrollmentId,
      input.userId,
    );

    if (currentStep.enrollment.trailId !== assessment.trailId) {
      throw assessmentError(
        403,
        "Esta avaliação não pertence à matrícula informada.",
      );
    }

    if (assessment.scope === "lesson") {
      if (
        !assessment.lessonId ||
        currentStep.enrollment.currentLessonId !== assessment.lessonId ||
        currentStep.enrollment.currentModuleId !== assessment.moduleId
      ) {
        throw assessmentError(
          409,
          "Esta avaliação não corresponde à aula atual.",
        );
      }
    } else if (
      currentStep.nextStep.type !== "assessment" ||
      currentStep.nextStep.assessmentId !== assessment.id
    ) {
      throw assessmentError(409, "Esta não é a avaliação atual do módulo.");
    }

    const attemptsSnapshot = await db
      .collection(ATTEMPTS)
      .where("assessmentId", "==", assessment.id)
      .get();

    const userAttempts = attemptsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return (
        data.userId === input.userId && data.enrollmentId === input.enrollmentId
      );
    });

    if (
      assessment.maxAttempts &&
      userAttempts.length >= assessment.maxAttempts
    ) {
      throw assessmentError(
        409,
        "O limite de tentativas desta avaliação foi atingido.",
      );
    }

    const answers = sanitizeAnswers(input.answers);
    const answerMap = new Map(
      answers.map((answer) => [answer.questionId, answer.optionIds]),
    );
    const results = assessment.questions.map((question) =>
      this.gradeQuestion(question, answerMap.get(question.id) ?? []),
    );

    const pointsAvailable = results.reduce(
      (sum, result) => sum + result.pointsAvailable,
      0,
    );
    const pointsEarned = results.reduce(
      (sum, result) => sum + result.pointsEarned,
      0,
    );
    const score =
      pointsAvailable <= 0
        ? 0
        : Math.round((pointsEarned / pointsAvailable) * 100);
    const passed = score >= assessment.passingScore;
    const now = Timestamp.now();
    const attemptRef = db.collection(ATTEMPTS).doc();

    await attemptRef.set({
      id: attemptRef.id,
      assessmentId: assessment.id,
      trailId: assessment.trailId,
      moduleId: assessment.moduleId,
      lessonId: assessment.lessonId ?? null,
      scope: assessment.scope,
      userId: input.userId,
      enrollmentId: input.enrollmentId,
      attemptNumber: userAttempts.length + 1,
      score,
      passed,
      correctAnswers: results.filter((result) => result.correct).length,
      totalQuestions: assessment.questions.length,
      answers,
      results,
      createdAt: now,
      completedAt: now,
    });

    let flowResult:
      | Awaited<ReturnType<typeof LearningFlowService.completeModuleAssessment>>
      | undefined;

    if (passed) {
      if (assessment.scope === "module") {
        flowResult = await LearningFlowService.completeModuleAssessment({
          enrollmentId: input.enrollmentId,
          userId: input.userId,
          assessmentId: assessment.id,
        });
      } else {
        await LearningFlowService.recordPassedLessonAssessment({
          enrollmentId: input.enrollmentId,
          userId: input.userId,
          assessmentId: assessment.id,
        });
      }
      await GamificationService.awardEvent({
        userId: input.userId,
        event: "quiz_completed",
        sourceId: assessment.id,
        idempotencyKey: `quiz_${input.userId}_${assessment.id}`,
        metadata: {
          attemptId: attemptRef.id,
          score,
          correctAnswers: results.filter((item) => item.correct).length,
        },
      });
      if (flowResult?.newlyCompletedModule && flowResult.newlyCompletedModuleId) {
        await GamificationService.awardEvent({
          userId: input.userId,
          event: "module_completed",
          sourceId: flowResult.newlyCompletedModuleId,
          idempotencyKey: `module_${input.userId}_${flowResult.newlyCompletedModuleId}`,
        });
      }
      if (flowResult?.newlyCompletedTrail) {
        await GamificationService.awardEvent({
          userId: input.userId,
          event: "trail_completed",
          sourceId: flowResult.enrollment.trailId,
          idempotencyKey: `trail_${input.userId}_${flowResult.enrollment.trailId}`,
        });
      }
    }

    return {
      attemptId: attemptRef.id,
      assessmentId: assessment.id,
      score,
      passed,
      correctAnswers: results.filter((result) => result.correct).length,
      totalQuestions: assessment.questions.length,
      results,
      nextStep: flowResult?.nextStep,
      enrollment: flowResult?.enrollment,
    };
  }

  static async create(data: Partial<IAssessment>, userId?: string) {
    const ref = db.collection(ASSESSMENTS).doc();
    const assessment = new Assessment({
      ...data,
      id: ref.id,
      createdBy: userId ?? data.createdBy,
      updatedBy: userId ?? data.updatedBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await ref.set(assessment.toObject());
    return assessment;
  }

  static async update(id: string, data: Partial<IAssessment>, userId?: string) {
    const current = await this.getById(id);
    const assessment = new Assessment({
      ...current.toObject(),
      ...data,
      id,
      createdAt: current.createdAt,
      createdBy: current.createdBy,
      updatedBy: userId ?? data.updatedBy ?? current.updatedBy,
      updatedAt: Timestamp.now(),
    });
    await db
      .collection(ASSESSMENTS)
      .doc(id)
      .set(assessment.toObject(), { merge: false });
    return assessment;
  }

  static async delete(id: string) {
    await db.collection(ASSESSMENTS).doc(id).delete();
  }
}

export const getAssessmentErrorStatus = (error: unknown) =>
  error instanceof Error &&
  "status" in error &&
  typeof (error as Error & { status?: unknown }).status === "number"
    ? (error as Error & { status: number }).status
    : 500;
