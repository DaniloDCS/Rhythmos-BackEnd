import type { Timestamp } from "firebase-admin/firestore";

export type XpActivityCategory =
  | "trilhas"
  | "aulas"
  | "jogos"
  | "quizzes"
  | "simulacoes"
  | "streak"
  | "outros";

export interface IXpActivityRule {
  id?: string;
  key: string;
  name: string;
  description?: string;
  category: XpActivityCategory;
  xp: number;
  active: boolean;
  repeatable: boolean;
  dailyLimit?: number | null;
  order: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
