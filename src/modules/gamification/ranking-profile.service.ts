import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { userGamificationRef } from "./user-gamification.repository";

export const rankingProfileRef = (userId: string) =>
  db.collection("ranking_profiles").doc(userId);

const number = (value: unknown) => Number(value) || 0;

export const buildRankingProfile = (
  userId: string,
  progress: FirebaseFirestore.DocumentData,
  user: FirebaseFirestore.DocumentData,
  previous?: FirebaseFirestore.DocumentData,
) => {
  const score = number(progress.ranking?.score);
  const previousScore = number(previous?.score);
  return {
    userId,
    name: String(user.name ?? "Usuário"),
    username: String(user.username ?? ""),
    avatar: user.avatar ?? user.photoURL ?? null,
    active: progress.active !== false && user.active !== false,
    score,
    level: number(progress.level?.current) || 1,
    levelTitle: String(progress.level?.currentTitle ?? ""),
    xp: number(progress.xp?.total),
    wins: number(progress.games?.wins),
    completedGames: number(progress.games?.completed),
    perfectRuns: number(progress.games?.perfectRuns),
    streak: number(progress.streak?.current),
    badges: Array.isArray(progress.badges) ? progress.badges.length : 0,
    reachedScoreAt: score !== previousScore
      ? Timestamp.now()
      : previous?.reachedScoreAt ?? Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

export const syncRankingProfile = async (userId: string) => {
  const ref = rankingProfileRef(userId);
  const [progress, user, existing] = await Promise.all([
    userGamificationRef(userId).get(),
    db.collection("users").doc(userId).get(),
    ref.get(),
  ]);
  if (!progress.exists || !user.exists) {
    await ref.delete();
    return null;
  }
  const payload = buildRankingProfile(
    userId,
    progress.data()!,
    user.data()!,
    existing.data(),
  );
  await ref.set(payload);
  return payload;
};
