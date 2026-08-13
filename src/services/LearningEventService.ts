import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";

export type LearningEventType =
  | "trail_enrolled"
  | "trail_blocked"
  | "trail_completed"
  | "lesson_started"
  | "lesson_completed"
  | "game_completed"
  | "simulation_completed"
  | "certificate_issued";

export interface LearningEventInput {
  userId: string;
  type: LearningEventType;
  trailId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  lessonName?: string | null;
  gameId?: string | null;
  gameName?: string | null;
  simulatorId?: string | null;
  simulatorName?: string | null;
  score?: number | null;
  correctAnswers?: number | null;
  totalAnswers?: number | null;
  attempt?: number | null;
  xpAwarded?: number | null;
  metadata?: Record<string, unknown>;
}

export const recordLearningEvent = async (input: LearningEventInput) => {
  if (!input.userId?.trim()) {
    throw new Error(
      "userId é obrigatório para registrar um evento de aprendizagem.",
    );
  }

  const ref = db.collection("learning_events").doc();

  const payload = {
    id: ref.id,
    ...input,
    userId: input.userId.trim(),
    trailId: input.trailId?.trim() || null,
    moduleId: input.moduleId?.trim() || null,
    lessonId: input.lessonId?.trim() || null,
    lessonName: input.lessonName?.trim() || null,
    gameId: input.gameId?.trim() || null,
    gameName: input.gameName?.trim() || null,
    simulatorId: input.simulatorId?.trim() || null,
    simulatorName: input.simulatorName?.trim() || null,
    score: Number.isFinite(Number(input.score)) ? Number(input.score) : null,
    correctAnswers: Number.isFinite(Number(input.correctAnswers))
      ? Number(input.correctAnswers)
      : null,
    totalAnswers: Number.isFinite(Number(input.totalAnswers))
      ? Number(input.totalAnswers)
      : null,
    attempt: Number.isFinite(Number(input.attempt))
      ? Number(input.attempt)
      : null,
    xpAwarded: Number.isFinite(Number(input.xpAwarded))
      ? Number(input.xpAwarded)
      : 0,
    metadata: input.metadata ?? {},
    createdAt: Timestamp.now(),
  };

  await ref.set(payload);
  return payload;
};

export const recordLearningEventSafe = async (
  input: LearningEventInput,
): Promise<void> => {
  try {
    await recordLearningEvent(input);
  } catch (error) {
    console.error(
      `[LearningEvent] Falha ao registrar ${input.type} para ${input.userId}:`,
      error,
    );
  }
};
