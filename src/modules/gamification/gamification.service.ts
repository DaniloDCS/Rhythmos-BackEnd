import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { ILevel } from "../levels/level.types";
import { grantRewardsInTransaction } from "../rewards/reward.service";
import type { GrantedReward } from "../rewards/reward.service";
import { userGamificationRef } from "./user-gamification.repository";
import { syncRankingProfile } from "./ranking-profile.service";
import { syncUserBadges } from "../badges/badge-award.service";
import type { IUserProgress } from "../users/user-progress.types";
import type { IUserBadgeProgress } from "../users/user-progress.types";
import { calculateRankingScore } from "./gamification-settings.service";
import type {
  AwardEventInput,
  GamificationSettings,
  XpBreakdown,
} from "./gamification.types";
import { calculateRepeatAward } from "./gamification.math";

export interface GamificationAwardResult {
  duplicate: boolean;
  progress: IUserProgress;
  xp: XpBreakdown;
  levelUp: boolean;
  newlyUnlockedLevels: ILevel[];
  rewards: GrantedReward[];
  newlyUnlockedBadges: IUserBadgeProgress[];
  streakMilestone?: GamificationSettings["streakMilestones"][number] | null;
  milestoneResult: GamificationAwardResult | null;
}

const sanitizeId = (value: string) =>
  value.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 300);

const periodKey = (settings: GamificationSettings, now = new Date()) => {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.antiFarming.timezone || settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  if (settings.antiFarming.period === "permanent") return "permanent";
  if (settings.antiFarming.period === "weekly") {
    const d = new Date(`${date}T00:00:00Z`);
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    return d.toISOString().slice(0, 10);
  }
  return date;
};

const updateStreak = (progress: IUserProgress, settings: GamificationSettings) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const last = progress.streak?.lastActivityDate ?? null;
  if (last === today) return { changed: false, streak: progress.streak };
  const previous = new Date(`${today}T00:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const current = last === previous.toISOString().slice(0, 10)
    ? Number(progress.streak?.current ?? 0) + 1
    : 1;
  return {
    changed: true,
    streak: {
      current,
      best: Math.max(Number(progress.streak?.best ?? 0), current),
      lastActivityDate: today,
    },
  };
};

const getConfiguredXp = async (event: string) => {
  const snapshot = await db
    .collection("xp_activity_rules")
    .where("key", "==", event)
    .limit(1)
    .get();
  if (snapshot.empty) return { xp: 0, active: false };
  const data = snapshot.docs[0].data();
  return { xp: Math.max(0, Number(data.xp ?? 0)), active: data.active === true };
};

export class GamificationService {
  static async awardEvent(input: AwardEventInput): Promise<GamificationAwardResult> {
    const settingsRef = db.collection("gamification_settings").doc("global");
    const progressRef = userGamificationRef(input.userId);
    const eventRef = db
      .collection("xp_activity_history")
      .doc(sanitizeId(input.idempotencyKey));
    const configured =
      input.baseXp === undefined ? await getConfiguredXp(input.event) : null;

    const result = await db.runTransaction(async (transaction) => {
      const [settingsSnapshot, progressSnapshot, eventSnapshot, levelsSnapshot] =
        await Promise.all([
          transaction.get(settingsRef),
          transaction.get(progressRef),
          transaction.get(eventRef),
          transaction.get(db.collection("levels").where("active", "==", true)),
        ]);
      if (!settingsSnapshot.exists) throw new Error("GAMIFICATION_SETTINGS_NOT_CONFIGURED");
      if (!progressSnapshot.exists) throw new Error("PROGRESS_NOT_FOUND");
      const settings = settingsSnapshot.data() as GamificationSettings;
      const progress = progressSnapshot.data() as IUserProgress;
      const previousXp = Number(progress.xp?.total ?? 0);
      if (eventSnapshot.exists) {
        return {
          duplicate: true,
          progress,
          xp: {
            base: 0,
            repeatNumber: 0,
            repeatMultiplier: 0,
            repeatAdjusted: 0,
            bonuses: [],
            added: 0,
            previous: previousXp,
            current: previousXp,
            reason: "duplicate" as const,
          },
          levelUp: false,
          newlyUnlockedLevels: [],
          rewards: [],
          streakMilestone: null,
        };
      }

      const base = input.baseXp === undefined
        ? configured?.active ? configured.xp : 0
        : Math.max(0, Number(input.baseXp));
      const policyApplies = input.event === "game_completed" &&
        !input.bypassAntiFarming && settings.antiFarming.active;
      const key = periodKey(settings);
      const counterRef = db.collection("gamification_counters").doc(
        sanitizeId(`${input.userId}_${input.event}_${input.sourceId}_${key}`),
      );
      const counterSnapshot = policyApplies
        ? await transaction.get(counterRef)
        : null;
      const previousCount = Number(counterSnapshot?.data()?.count ?? 0);
      const previousPeriodXp = Number(counterSnapshot?.data()?.xpAwarded ?? 0);
      const repeat = policyApplies
        ? calculateRepeatAward(base, previousCount, previousPeriodXp, settings.antiFarming)
        : { repeatNumber: 1, multiplier: 1, xp: base };
      const repeatNumber = repeat.repeatNumber;
      const multiplier = repeat.multiplier;
      let adjusted = repeat.xp;
      const lastAwardedMillis = Number(
        counterSnapshot?.data()?.lastAwardedAt?.toMillis?.() ?? 0,
      );
      const cooldownActive = policyApplies &&
        settings.antiFarming.cooldownSeconds > 0 &&
        Date.now() - lastAwardedMillis < settings.antiFarming.cooldownSeconds * 1000;
      if (cooldownActive) adjusted = 0;

      let eventProgress = progress;
      if (input.event === "game_completed") {
        const won = input.metadata?.won === true;
        const perfect = input.metadata?.perfect === true;
        const correctAnswers = Math.max(0, Number(input.metadata?.correctAnswers ?? 0));
        const timeSeconds = Math.max(0, Number(input.metadata?.timeSeconds ?? 0));
        const games = progress.games ?? {
          played: 0, completed: 0, wins: 0, perfectRuns: 0,
          totalPlayTimeSeconds: 0, lastPlayedAt: null,
        };
        eventProgress = {
          ...progress,
          games: {
            ...games,
            played: Number(games.played ?? 0) + 1,
            completed: Number(games.completed ?? 0) + 1,
            wins: Number(games.wins ?? 0) + (won ? 1 : 0),
            perfectRuns: Number(games.perfectRuns ?? 0) + (perfect ? 1 : 0),
            correctAnswers: Number(games.correctAnswers ?? 0) + correctAnswers,
            totalPlayTimeSeconds: Number(games.totalPlayTimeSeconds ?? 0) + timeSeconds,
            lastPlayedAt: new Date().toISOString(),
          },
        };
      }
      const countsAsActivity = ![
        "admin_reward", "xp_bonus", "game_perfect", "streak_milestone",
      ].includes(input.event);
      const streakResult = countsAsActivity
        ? updateStreak(eventProgress, settings)
        : { changed: false, streak: eventProgress.streak };
      if (streakResult.changed) {
        eventProgress = { ...eventProgress, streak: streakResult.streak };
      }
      const levels = levelsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as ILevel)
        .sort((a, b) => a.levelNumber - b.levelNumber);
      if (!levels.length) throw new Error("LEVELS_NOT_CONFIGURED");
      const newTotalXp = previousXp + adjusted;
      const oldLevel = Number(progress.level?.current ?? levels[0].levelNumber);
      const currentLevel = [...levels].reverse().find((level) => newTotalXp >= level.xpMin) ?? levels[0];
      const levelIndex = levels.findIndex((level) => level.levelNumber === currentLevel.levelNumber);
      const nextLevel = levels[levelIndex + 1];
      const range = nextLevel
        ? nextLevel.xpMin - currentLevel.xpMin
        : currentLevel.xpMax - currentLevel.xpMin;
      const inLevel = Math.max(0, newTotalXp - currentLevel.xpMin);
      const newlyUnlockedLevels = levels.filter(
        (level) => level.levelNumber > oldLevel && level.levelNumber <= currentLevel.levelNumber,
      );
      const levelHistory = [...(progress.levels ?? [])];
      for (const level of newlyUnlockedLevels) {
        if (!levelHistory.some((item) => item.level === level.levelNumber)) {
          levelHistory.push({
            level: level.levelNumber,
            title: level.name,
            unlocked: true,
            reachedAt: new Date().toISOString(),
          });
        }
      }
      levelHistory.sort((a, b) => a.level - b.level);
      const levelRewardRequests = levels
        .filter((level) => level.levelNumber <= currentLevel.levelNumber)
        .flatMap((level) => (level.rewardIds ?? []).map((rewardId) => ({
          rewardId,
          source: { type: "level" as const, id: level.id ?? String(level.levelNumber) },
        })));
      const explicitRewardRequests = (input.rewardIds ?? []).map((rewardId) => ({
        rewardId,
        source: { type: "manual" as const, id: input.sourceId },
      }));
      const rewardResult = await grantRewardsInTransaction(
        transaction,
        eventProgress,
        [...levelRewardRequests, ...explicitRewardRequests],
      );
      const nextProgress: IUserProgress = {
        ...rewardResult.progress,
        xp: {
          total: newTotalXp,
          currentLevelXp: nextLevel ? inLevel : Math.min(inLevel, Math.max(0, range)),
          nextLevelXp: Math.max(0, range),
        },
        level: {
          current: currentLevel.levelNumber,
          currentTitle: currentLevel.name,
          progressPercent: nextLevel && range > 0
            ? Math.min(100, Number(((inLevel / range) * 100).toFixed(2)))
            : 100,
        },
        levels: levelHistory,
        updatedAt: Timestamp.now(),
      };
      const rankingScore = calculateRankingScore(nextProgress, settings.ranking);
      const breakdown: XpBreakdown = {
        base,
        repeatNumber,
        repeatMultiplier: multiplier,
        repeatAdjusted: adjusted,
        bonuses: [],
        added: adjusted,
        previous: previousXp,
        current: newTotalXp,
        reason: cooldownActive ? "cooldown" : adjusted <= 0 ? "limit" : null,
      };
      transaction.set(progressRef, {
        ...nextProgress,
        ranking: { score: rankingScore, updatedAt: Timestamp.now() },
      }, { merge: true });
      transaction.create(eventRef, {
        userId: input.userId,
        ruleKey: input.event,
        sourceId: input.sourceId,
        idempotencyKey: input.idempotencyKey,
        xp: adjusted,
        breakdown,
        metadata: input.metadata ?? {},
        periodKey: key,
        createdAt: Timestamp.now(),
      });
      if (policyApplies) {
        transaction.set(counterRef, {
          userId: input.userId,
          event: input.event,
          sourceId: input.sourceId,
          periodKey: key,
          count: repeatNumber,
          xpAwarded: previousPeriodXp + adjusted,
          lastAwardedAt: Timestamp.now(),
        }, { merge: true });
      }
      return {
        duplicate: false,
        progress: nextProgress,
        xp: breakdown,
        levelUp: currentLevel.levelNumber > oldLevel,
        newlyUnlockedLevels,
        rewards: rewardResult.granted,
        streakMilestone: streakResult.changed
          ? settings.streakMilestones.find(
              (item) => item.active && item.days === streakResult.streak.current,
            ) ?? null
          : null,
      };
    });
    if (!result.duplicate) {
      const badgeResult = await syncUserBadges(input.userId);
      result.progress = badgeResult.progress;
      const milestoneResult: GamificationAwardResult | null = result.streakMilestone
        ? await GamificationService.awardEvent({
            userId: input.userId,
            event: "streak_milestone",
            sourceId: result.streakMilestone.id,
            idempotencyKey: `streak_${input.userId}_${result.streakMilestone.id}_${result.progress.streak.best}`,
            baseXp: result.streakMilestone.xp,
            metadata: { days: result.streakMilestone.days },
          })
        : null;
      await syncRankingProfile(input.userId);
      return {
        ...result,
        newlyUnlockedBadges: badgeResult.newlyUnlocked,
        milestoneResult,
      };
    }
    return { ...result, newlyUnlockedBadges: [], milestoneResult: null };
  }
}
