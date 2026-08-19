import { Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import type { IUserBadgeProgress, IUserProgress } from "../users/user-progress.types";
import type { BadgeConditionType, IBadge } from "./badge.types";

export interface UserBadgeView extends IBadge {
  id: string;
  unlocked: boolean;
  unlockedAt?: string | null;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
}

const metricForCondition = (
  type: BadgeConditionType,
  progress: IUserProgress,
) => {
  const activities =
    Number(progress.games?.completed ?? 0) +
    Number(progress.stats?.quizzesCompleted ?? 0) +
    Number(progress.stats?.simulationsCompleted ?? 0) +
    Number(progress.stats?.trailsCompleted ?? 0);

  return {
    level_reached: Number(progress.level?.current ?? 1),
    xp_total: Number(progress.xp?.total ?? 0),
    games_completed: Number(progress.games?.completed ?? 0),
    activities_completed: activities,
    correct_answers: Number(progress.games?.wins ?? 0),
    streak_days: Number(progress.streak?.best ?? progress.streak?.current ?? 0),
    trail_completed: Number(progress.stats?.trailsCompleted ?? 0),
    manual: 0,
  }[type];
};

export const syncUserBadges = async (userId: string) => {
  const progressRef = db.collection("user_progress").doc(userId);
  const [progressSnapshot, badgesSnapshot, completedTrailsSnapshot] =
    await Promise.all([
      progressRef.get(),
      db.collection("badges").where("active", "==", true).get(),
      db
        .collection("enrollments")
        .where("userId", "==", userId)
        .where("status", "==", "concluido")
        .get(),
    ]);

  if (!progressSnapshot.exists) {
    throw new Error("PROGRESS_NOT_FOUND");
  }

  const progress = progressSnapshot.data() as IUserProgress;
  const previousCompletedTrails = Number(progress.stats?.trailsCompleted ?? 0);
  progress.stats = {
    quizzesCompleted: Number(progress.stats?.quizzesCompleted ?? 0),
    simulationsCompleted: Number(progress.stats?.simulationsCompleted ?? 0),
    supportMaterialsViewed: Number(
      progress.stats?.supportMaterialsViewed ?? 0,
    ),
    trailsCompleted: completedTrailsSnapshot.size,
  };
  const earned = [...(progress.badges ?? [])];
  const earnedIds = new Set(earned.map((item) => item.badgeId));
  const newlyUnlocked: IUserBadgeProgress[] = [];
  const badges = badgesSnapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<IBadge, "id">) }))
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

  for (const badge of badges) {
    const condition = badge.condition ?? { type: "manual" as const, value: 0 };
    if (condition.type === "manual" || earnedIds.has(badge.id)) continue;
    if (metricForCondition(condition.type, progress) < Number(condition.value)) {
      continue;
    }

    const unlocked: IUserBadgeProgress = {
      badgeId: badge.id,
      name: badge.name,
      unlockedAt: new Date().toISOString(),
    };
    earned.push(unlocked);
    newlyUnlocked.push(unlocked);
    earnedIds.add(badge.id);
  }

  if (
    newlyUnlocked.length ||
    previousCompletedTrails !== completedTrailsSnapshot.size
  ) {
    await progressRef.set(
      {
        badges: earned,
        stats: progress.stats,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  }

  const earnedMap = new Map(earned.map((item) => [item.badgeId, item]));
  const catalog: UserBadgeView[] = badges.map((badge) => {
    const condition = badge.condition ?? { type: "manual" as const, value: 0 };
    const currentValue = metricForCondition(condition.type, progress);
    const targetValue = Number(condition.value ?? 0);
    const unlocked = earnedMap.get(badge.id);
    return {
      ...badge,
      unlocked: Boolean(unlocked),
      unlockedAt: unlocked?.unlockedAt,
      currentValue,
      targetValue,
      progressPercent: unlocked
        ? 100
        : targetValue <= 0
          ? 0
          : Math.min(100, Math.round((currentValue / targetValue) * 100)),
    };
  });

  return { progress: { ...progress, badges: earned }, catalog, newlyUnlocked };
};
