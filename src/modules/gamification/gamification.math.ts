import type { AntiFarmingPolicy, RankingSettings } from "./gamification.types";

export const calculateRepeatAward = (
  baseXp: number,
  previousCount: number,
  previousPeriodXp: number,
  policy: AntiFarmingPolicy,
) => {
  const repeatNumber = previousCount + 1;
  let multiplier = Number(
    policy.multipliers[previousCount] ?? policy.afterLimitMultiplier,
  );
  if (
    policy.maxRewardedCompletions !== null &&
    repeatNumber > policy.maxRewardedCompletions
  ) multiplier = policy.afterLimitMultiplier;
  let xp = Math.max(
    policy.minimumRepeatXp,
    Math.round(Math.max(0, baseXp) * Math.max(0, multiplier)),
  );
  if (policy.maxXpPerPeriod !== null) {
    xp = Math.min(xp, Math.max(0, policy.maxXpPerPeriod - previousPeriodXp));
  }
  return { repeatNumber, multiplier, xp };
};

export const rankingScore = (
  progress: Record<string, unknown> & {
    xp?: { total?: number };
    games?: { wins?: number; completed?: number; perfectRuns?: number };
    streak?: { current?: number };
  },
  settings: RankingSettings,
) => Math.round(
  Number(progress.xp?.total ?? 0) * settings.xpWeight +
  Number(progress.games?.wins ?? 0) * settings.victoryWeight +
  Number(progress.games?.completed ?? 0) * settings.completedGameWeight +
  Number(progress.games?.perfectRuns ?? 0) * settings.perfectRunWeight +
  Number(progress.streak?.current ?? 0) * settings.streakWeight,
);
