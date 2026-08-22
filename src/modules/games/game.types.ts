import { Timestamp } from "firebase-admin/firestore";

import { TStatus } from "../../shared/domain.types";

export type TGameDifficulty = "facil" | "medio" | "dificil";

export type TGameCategory =
  | "quiz"
  | "associacao"
  | "velocidade"
  | "memoria"
  | "arraste_e_solte"
  | "outro";

export interface IGameContent {
  startTitle?: string;
  objective?: string;
  instructions?: string;
  tips?: string[];
}

export interface IGame {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  category?: TGameCategory;
  difficulty?: TGameDifficulty;
  status: TStatus;
  featured?: boolean;
  players?: number;
  xpReward: number;
  tags?: string[];
  content?: IGameContent;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
