import { Timestamp } from "firebase-admin/firestore";

export type TUserRoles = "administrador" | "usuario";

export type TUserThemes =
  | "theme-navy"
  | "theme-ocean"
  | "theme-electric"
  | "theme-emerald"
  | "theme-danger"
  | "theme-slate"
  | "theme-moss"
  | "theme-amber"
  | "theme-slateblue"
  | "theme-purple"
  | "theme-ebserh";

export interface IUser {
  id?: string;
  username: string;
  name: string;
  email: string;
  biography: string;
  role: TUserRoles;
  theme?: TUserThemes;
  location?: string;
  lastAccessAt?: string | null;
  social?: {
    linkedin?: string;
    lattes?: string;
    orcid?: string;
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

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

export interface IUserRewardProgress {
  rewardId: string;
  name: string;
  status: "disponivel" | "resgatado" | "bloqueado";
  claimedAt?: string | null;
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
  };

  badges: IUserBadgeProgress[];

  rewards: IUserRewardProgress[];

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
