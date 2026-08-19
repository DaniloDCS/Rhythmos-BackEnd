import { Timestamp } from "firebase-admin/firestore";

export type RewardType =
  | "badge"
  | "unlock_game"
  | "unlock_trail"
  | "unlock_module"
  | "title"
  | "theme"
  | "xp_bonus"
  | "special_content"
  | "other";

export interface IReward {
  id?: string;

  name: string;
  description?: string;

  type: RewardType;
  value?: string;

  icon?: string;
  imageUrl?: string;
  color?: string;

  active: boolean;
  featured?: boolean;
  repeatable?: boolean;
  order: number;

  createdBy?: string;
  updatedBy?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
