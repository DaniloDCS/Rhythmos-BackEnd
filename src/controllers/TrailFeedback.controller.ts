import type { Response } from "express";
import { db } from "../config/firebase";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  createTrailFeedback,
  TrailFeedbackType,
} from "../services/TrailFeedbackService";

export const submitTrailFeedback = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const trailId = String(req.params.trailId ?? "").trim();
    const userId = req.user.uid;
    const type = String(req.body?.type ?? "feedback") as TrailFeedbackType;
    const ratingRaw = req.body?.rating;
    const rating =
      ratingRaw === undefined || ratingRaw === null || ratingRaw === ""
        ? null
        : Number(ratingRaw);

    if (!trailId) {
      return res.status(400).json({ message: "trailId é obrigatório." });
    }

    const trailDoc = await db.collection("trails").doc(trailId).get();
    if (!trailDoc.exists) {
      return res.status(404).json({ message: "Trilha não encontrada." });
    }

    const enrollment = await db
      .collection("enrollments")
      .where("trailId", "==", trailId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (enrollment.empty) {
      return res.status(403).json({
        message: "Somente usuários matriculados podem avaliar esta trilha.",
      });
    }

    const feedback = await createTrailFeedback({
      trailId,
      userId,
      type,
      rating: rating as 1 | 2 | 3 | 4 | 5 | null,
      message: req.body?.message,
    });

    return res.status(200).json({
      message:
        type === "feedback"
          ? "Avaliação registrada com sucesso."
          : "Manifestação registrada com sucesso.",
      feedback,
    });
  } catch (error) {
    console.error("Erro ao registrar feedback da trilha:", error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Erro ao registrar feedback da trilha.",
    });
  }
};

export const getMyTrailFeedback = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const trailId = String(req.params.trailId ?? "").trim();
    const userId = req.user.uid;

    const snapshot = await db
      .collection("trail_feedback")
      .where("trailId", "==", trailId)
      .where("userId", "==", userId)
      .get();

    return res.status(200).json(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    );
  } catch (error) {
    console.error("Erro ao buscar feedback da trilha:", error);
    return res.status(500).json({ message: "Erro ao buscar feedback." });
  }
};
