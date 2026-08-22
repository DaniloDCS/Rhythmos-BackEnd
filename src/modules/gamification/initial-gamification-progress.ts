import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { ILevel } from "../levels/level.model";
import type { IUserProgress } from "../users/user-progress.types";

export const createInitialGamificationProgress = async (userId: string): Promise<IUserProgress> => {
  const snapshot = await db.collection("levels").where("active", "==", true).get();
  const levels = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ILevel[];
  levels.sort((a, b) => a.levelNumber - b.levelNumber);
  const initial = levels[0];
  if (!initial) throw new Error("Nenhum nível ativo foi cadastrado.");
  const now = Timestamp.now();
  return {
    id: userId, userId,
    xp: { total: 0, currentLevelXp: 0, nextLevelXp: Math.max(0, initial.xpMax - initial.xpMin) },
    level: { current: initial.levelNumber, currentTitle: initial.name, progressPercent: 0 },
    levels: [{ level: initial.levelNumber, title: initial.name, unlocked: true, reachedAt: now.toDate().toISOString() }],
    games: { played: 0, completed: 0, wins: 0, perfectRuns: 0, correctAnswers: 0, totalPlayTimeSeconds: 0, lastPlayedAt: null },
    badges: [], rewards: [], unlocked: { games: {}, trails: {}, modules: {} },
    streak: { current: 0, best: 0, lastActivityDate: null },
    stats: { quizzesCompleted: 0, simulationsCompleted: 0, trailsCompleted: 0, supportMaterialsViewed: 0 },
    active: true, createdAt: now, updatedAt: now,
  };
};
