import { db } from "../../config/firebase";
import type { IUserProgress } from "../users/user-progress.types";
import type { ILevel } from "../levels/level.model";
import { grantRewardsToUser, type RewardGrantRequest } from "./reward.service";

const migrateRewardUnlocks = async () => {
  const [progressSnapshot, levelsSnapshot, enrollmentsSnapshot] =
    await Promise.all([
      db.collection("user_progress").get(),
      db.collection("levels").where("active", "==", true).get(),
      db.collection("enrollments").get(),
    ]);

  const levels = levelsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as ILevel)
    .sort((a, b) => a.levelNumber - b.levelNumber);

  const completedLessonIdsByUser = new Map<string, Set<string>>();

  for (const enrollmentDoc of enrollmentsSnapshot.docs) {
    const enrollment = enrollmentDoc.data();
    const userId = String(enrollment.userId ?? "").trim();

    if (!userId) continue;

    const completedLessonsMap =
      (enrollment.completedLessonsMap as Record<string, boolean> | undefined) ??
      {};

    const set = completedLessonIdsByUser.get(userId) ?? new Set<string>();

    for (const [lessonId, completed] of Object.entries(completedLessonsMap)) {
      if (completed) set.add(lessonId);
    }

    completedLessonIdsByUser.set(userId, set);
  }

  for (const progressDoc of progressSnapshot.docs) {
    const progress = progressDoc.data() as IUserProgress;
    const userId = progress.userId || progressDoc.id;
    const currentLevel = Number(progress.level?.current ?? 1);

    const requests: RewardGrantRequest[] = levels
      .filter((level) => level.levelNumber <= currentLevel)
      .flatMap((level) =>
        (level.rewardIds ?? []).map((rewardId) => ({
          rewardId,
          source: {
            type: "level" as const,
            id: level.id ?? String(level.levelNumber),
          },
        })),
      );

    const completedLessonIds = [
      ...(completedLessonIdsByUser.get(userId) ?? new Set<string>()),
    ];

    if (completedLessonIds.length) {
      const lessonDocs = await Promise.all(
        completedLessonIds.map((lessonId) =>
          db.collection("lessons").doc(lessonId).get(),
        ),
      );

      for (const lessonDoc of lessonDocs) {
        if (!lessonDoc.exists) continue;

        const rawRewardIds = lessonDoc.data()?.completionRewardIds;
        const rewardIds = Array.isArray(rawRewardIds)
          ? rawRewardIds
              .filter((value): value is string => typeof value === "string")
              .map((value) => value.trim())
              .filter(Boolean)
          : [];

        for (const rewardId of rewardIds) {
          requests.push({
            rewardId,
            source: {
              type: "lesson",
              id: lessonDoc.id,
            },
          });
        }
      }
    }

    const result = await grantRewardsToUser(userId, requests);

    console.log(
      `[reward-migration] ${userId}: ${result.granted.length} nova(s) recompensa(s)`,
    );
  }

  console.log("[reward-migration] concluída.");
};

migrateRewardUnlocks().catch((error) => {
  console.error("[reward-migration] erro:", error);
  process.exitCode = 1;
});
