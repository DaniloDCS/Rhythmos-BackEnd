import type { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";

const COLLECTION = "experience_feedback";
const TARGET_TYPES = ["trail", "game", "lesson", "laboratory", "platform"] as const;
type TargetType = (typeof TARGET_TYPES)[number];
const feedbackId = (userId: string, targetType: string, targetId: string) => `${userId}_${targetType}_${targetId}`.replace(/[^a-zA-Z0-9_-]/g, "_");

export const getMyFeedback = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.uid) return res.status(401).json({ message: "Usuário não autenticado." });
  const targetType = String(req.query.targetType ?? "");
  const targetId = String(req.query.targetId ?? "");
  if (!TARGET_TYPES.includes(targetType as TargetType) || !targetId) return res.status(400).json({ message: "Destino do feedback inválido." });
  const snapshot = await db.collection(COLLECTION).doc(feedbackId(req.user.uid, targetType, targetId)).get();
  return res.json({ submitted: snapshot.exists, feedback: snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null });
};

export const submitFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Usuário não autenticado." });
    const targetType = String(req.body.targetType ?? "") as TargetType;
    const targetId = String(req.body.targetId ?? "").trim();
    const targetTitle = String(req.body.targetTitle ?? "").trim();
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment ?? "").trim();
    const category = String(req.body.category ?? "general").trim();
    if (!TARGET_TYPES.includes(targetType) || !targetId) return res.status(400).json({ message: "Destino do feedback inválido." });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "A avaliação deve ser de 1 a 5 estrelas." });
    if (comment.length > 1500) return res.status(400).json({ message: "O comentário deve ter no máximo 1500 caracteres." });
    const ref = db.collection(COLLECTION).doc(feedbackId(req.user.uid, targetType, targetId));
    const current = await ref.get();
    const now = Timestamp.now();
    const payload = { userId: req.user.uid, targetType, targetId, targetTitle, rating, comment, category, type: rating <= 2 ? "complaint" : "review", updatedAt: now, ...(current.exists ? {} : { createdAt: now }) };
    await ref.set(payload, { merge: true });
    return res.status(current.exists ? 200 : 201).json({ message: current.exists ? "Feedback atualizado com sucesso." : "Obrigado pelo seu feedback!", feedback: { id: ref.id, ...payload } });
  } catch (error) {
    return res.status(500).json({ message: "Não foi possível salvar o feedback.", error: error instanceof Error ? error.message : String(error) });
  }
};
