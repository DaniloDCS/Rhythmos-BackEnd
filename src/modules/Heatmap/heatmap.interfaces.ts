import type { Timestamp } from "firebase-admin/firestore";
import type { HeatmapDate, HeatmapLevel } from "./heatmap.types";

export interface IHeatmapDay {
  value: number;
  level: HeatmapLevel;
}

export type IHeatmapDays = Partial<Record<HeatmapDate, IHeatmapDay>>;

export interface IHeatmap {
  id?: string;
  userId: string;
  year: number;
  total: number;
  streak: number;
  longestStreak: number;
  days: IHeatmapDays;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}
