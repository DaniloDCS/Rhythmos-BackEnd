import type { Request, Response } from "express";
import { db } from "../../config/firebase";

export const listFeedbackAdmin = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("experience_feedback").orderBy("updatedAt", "desc").get();
    const targetType = String(req.query.targetType ?? "");
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    if (targetType) items = items.filter((item) => item.targetType === targetType);
    const userIds = [...new Set(items.map((item) => String(item.userId ?? "")).filter(Boolean))];
    const userDocs = await Promise.all(userIds.map((id) => db.collection("users").doc(id).get()));
    const users = new Map(userDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));
    const feedback = items.map((item) => ({ ...item, userName: users.get(String(item.userId))?.name ?? "Usuário", userEmail: users.get(String(item.userId))?.email ?? null }));
    const ratings = feedback.map((item) => Number(item.rating)).filter(Number.isFinite);
    return res.json({ feedback, summary: { total: feedback.length, averageRating: ratings.length ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)) : 0, complaints: feedback.filter((item) => item.type === "complaint").length, withComments: feedback.filter((item) => Boolean(String(item.comment ?? "").trim())).length } });
  } catch (error) {
    return res.status(500).json({ message: "Não foi possível carregar os feedbacks.", error: error instanceof Error ? error.message : String(error) });
  }
};
