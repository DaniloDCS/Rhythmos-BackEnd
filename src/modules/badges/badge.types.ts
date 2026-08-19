import { Timestamp } from "firebase-admin/firestore";

export type BadgeRarity = "Comum" | "Rara" | "Épica" | "Lendária";

export type BadgeConditionType =
  | "level_reached"
  | "xp_total"
  | "games_completed"
  | "activities_completed"
  | "correct_answers"
  | "streak_days"
  | "trail_completed"
  | "manual";

export interface IBadgeCondition {
  type: BadgeConditionType;
  value: number;
}

export interface IBadge {
  id?: string;

  name: string;
  slug?: string;
  description?: string;

  fullImageUrl?: string;
  silhouetteImageUrl?: string;
  icon?: string;
  color?: string;

  rarity?: BadgeRarity;
  order: number;
  active: boolean;
  featured?: boolean;

  condition?: IBadgeCondition;

  createdBy?: string;
  updatedBy?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
