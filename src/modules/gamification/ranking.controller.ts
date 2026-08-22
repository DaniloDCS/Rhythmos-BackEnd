import type { Response } from "express";
import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { getGamificationSettings } from "./gamification-settings.service";
import { rankingProfileRef } from "./ranking-profile.service";

const parseLimit = (value: unknown, configured: number) =>
  Math.min(100, Math.max(1, Number(value) || configured));
const publicEntry = (p: FirebaseFirestore.DocumentData, position: number) => ({
  position,
  name: String(p.name ?? "Usuário"),
  username: String(p.username ?? ""),
  avatar: p.avatar ?? null,
  level: Number(p.level ?? 1),
  levelTitle: String(p.levelTitle ?? ""),
  xp: Number(p.xp ?? 0),
  score: Number(p.score ?? 0),
  wins: Number(p.wins ?? 0),
  completedGames: Number(p.completedGames ?? 0),
  perfectRuns: Number(p.perfectRuns ?? 0),
  streak: Number(p.streak ?? 0),
  badges: Number(p.badges ?? 0),
});

export const getGlobalRanking = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const settings = await getGamificationSettings();
    if (!settings.ranking.active)
      return res.status(404).json({ message: "Ranking indisponível." });
    const limit = parseLimit(req.query.limit, settings.ranking.pageSize);
    let query: FirebaseFirestore.Query = db
      .collection("ranking_profiles")
      .where("active", "==", true)
      .orderBy("score", "desc")
      .orderBy("xp", "desc")
      .orderBy("wins", "desc")
      .orderBy("reachedScoreAt", "asc")
      .limit(limit);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
    if (cursor) {
      const cursorDoc = await rankingProfileRef(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }
    const snapshot = await query.get();
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const top = snapshot.docs.map((doc, index) =>
      publicEntry(doc.data(), offset + index + 1),
    );
    let me = null;
    if (req.user?.uid) {
      const mine = await rankingProfileRef(req.user.uid).get();
      if (mine.exists) {
        const data = mine.data()!;
        const ahead = await db
          .collection("ranking_profiles")
          .where("active", "==", true)
          .where("score", ">", Number(data.score ?? 0))
          .count()
          .get();
        me = publicEntry(data, ahead.data().count + 1);
      }
    }
    return res.json({
      top,
      me,
      nextCursor: snapshot.docs.length
        ? snapshot.docs[snapshot.docs.length - 1].id
        : null,
      hasMore: snapshot.size === limit,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Erro ao carregar ranking.",
        error: error instanceof Error ? error.message : String(error),
      });
  }
};
