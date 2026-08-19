import { Timestamp } from "firebase-admin/firestore";

export interface ILevel {
  id?: string;
  name: string;
  description?: string;
  levelNumber: number;
  xpMin: number;
  xpMax: number;
  badgeName?: string;
  badgeImageUrl?: string;
  rewardIds: string[];
  active: boolean;
  featured?: boolean;
  color?: string;
  icon?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
