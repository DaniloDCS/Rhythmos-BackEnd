import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";

export type TrailFeedbackType = "feedback" | "complaint" | "suggestion";

export interface CreateTrailFeedbackInput {
  trailId: string;
  userId: string;
  rating?: 1 | 2 | 3 | 4 | 5 | null;
  type: TrailFeedbackType;
  message?: string;
}

const validate = (input: CreateTrailFeedbackInput) => {
  if (!input.trailId?.trim()) throw new Error("trailId é obrigatório.");
  if (!input.userId?.trim()) throw new Error("userId é obrigatório.");

  if (!["feedback", "complaint", "suggestion"].includes(input.type)) {
    throw new Error("Tipo de feedback inválido.");
  }

  if (
    input.rating !== undefined &&
    input.rating !== null &&
    ![1, 2, 3, 4, 5].includes(input.rating)
  ) {
    throw new Error("rating deve estar entre 1 e 5.");
  }
};

export const createTrailFeedback = async (
  input: CreateTrailFeedbackInput,
) => {
  validate(input);

  const trailId = input.trailId.trim();
  const userId = input.userId.trim();
  const now = Timestamp.now();

  /*
   * Avaliação da trilha: uma por usuário. Uma nova avaliação atualiza
   * a anterior, evitando que a mesma pessoa distorça a média.
   */
  if (input.type === "feedback") {
    const existing = await db
      .collection("trail_feedback")
      .where("trailId", "==", trailId)
      .where("userId", "==", userId)
      .where("type", "==", "feedback")
      .limit(1)
      .get();

    const ref = existing.empty
      ? db.collection("trail_feedback").doc()
      : existing.docs[0].ref;

    const previous = existing.empty ? null : existing.docs[0].data();
    const payload = {
      id: ref.id,
      trailId,
      userId,
      rating: input.rating ?? previous?.rating ?? null,
      type: input.type,
      message: input.message?.trim() ?? previous?.message ?? "",
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    await ref.set(payload, { merge: true });
    return payload;
  }

  const ref = db.collection("trail_feedback").doc();
  const payload = {
    id: ref.id,
    trailId,
    userId,
    rating: input.rating ?? null,
    type: input.type,
    message: input.message?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(payload);
  return payload;
};
