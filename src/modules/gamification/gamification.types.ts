export type GamificationEventKey =
  | "lesson_completed"
  | "module_completed"
  | "trail_completed"
  | "game_completed"
  | "game_perfect"
  | "quiz_completed"
  | "simulation_completed"
  | "clinical_case_completed"
  | "streak_milestone"
  | "admin_reward"
  | "xp_bonus";

export interface AntiFarmingPolicy {
  active: boolean;
  period: "daily" | "weekly" | "permanent";
  timezone: string;
  multipliers: number[];
  afterLimitMultiplier: number;
  maxRewardedCompletions: number | null;
  maxXpPerPeriod: number | null;
  cooldownSeconds: number;
  minimumRepeatXp: number;
}

export interface RankingSettings {
  active: boolean;
  xpWeight: number;
  victoryWeight: number;
  completedGameWeight: number;
  perfectRunWeight: number;
  streakWeight: number;
  pageSize: number;
}

export interface StreakMilestone {
  id: string;
  days: number;
  xp: number;
  active: boolean;
  order: number;
}

export interface GamificationSettings {
  timezone: string;
  antiFarming: AntiFarmingPolicy;
  ranking: RankingSettings;
  streakMilestones: StreakMilestone[];
}

export interface AwardEventInput {
  userId: string;
  event: GamificationEventKey;
  sourceId: string;
  idempotencyKey: string;
  baseXp?: number;
  bypassAntiFarming?: boolean;
  rewardIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface XpBreakdown {
  base: number;
  repeatNumber: number;
  repeatMultiplier: number;
  repeatAdjusted: number;
  bonuses: Array<{ key: string; xp: number }>;
  added: number;
  previous: number;
  current: number;
  reason?: "duplicate" | "inactive" | "limit" | "cooldown" | null;
}
