import { Timestamp } from "firebase-admin/firestore";

export interface IUserLevelHistory {
  level: number;
  title: string;
  unlocked: boolean;
  reachedAt?: string | null;
}

export interface IUserBadgeProgress {
  badgeId: string;
  name: string;
  unlockedAt?: string | null;
}

export type RewardSourceType =
  | "level"
  | "lesson"
  | "trail"
  | "achievement"
  | "manual";

export interface IUserRewardSource {
  type: RewardSourceType;
  id?: string | null;
}

export interface IUserRewardProgress {
  rewardId: string;
  name: string;
  type: string;
  value?: string | null;
  grantedAt: string;
  source: IUserRewardSource;
}

export interface IUserUnlockedContent {
  rewardId: string;
  unlockedAt: string;
  source: IUserRewardSource;
}

export interface IUserUnlocks {
  games: Record<string, IUserUnlockedContent>;
  trails: Record<string, IUserUnlockedContent>;
  modules: Record<string, IUserUnlockedContent>;
}

export interface IUserProgress {
  id?: string;
  userId: string;

  xp: {
    total: number;
    currentLevelXp: number;
    nextLevelXp: number;
  };

  level: {
    current: number;
    currentTitle: string;
    progressPercent: number;
  };

  levels: IUserLevelHistory[];

  games: {
    played: number;
    completed: number;
    wins: number;
    perfectRuns: number;
    totalPlayTimeSeconds: number;
    lastPlayedAt?: string | null;
    correctAnswers?: number;
  };

  badges: IUserBadgeProgress[];

  rewards: IUserRewardProgress[];

  unlocked: IUserUnlocks;

  streak: {
    current: number;
    best: number;
    lastActivityDate?: string | null;
  };

  stats: {
    quizzesCompleted: number;
    simulationsCompleted: number;
    trailsCompleted: number;
    supportMaterialsViewed: number;
  };

  active: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
