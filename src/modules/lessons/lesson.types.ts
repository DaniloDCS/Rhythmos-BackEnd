import { Timestamp } from "firebase-admin/firestore";

import { TStatus, TLevel, TVisibility } from "../../shared/domain.types";

import { IBlock } from "./block.types";

export type LessonType =
  | "Texto"
  | "Vídeo"
  | "Quiz"
  | "Jogo"
  | "Simulação"
  | "PDF"
  | "Áudio"
  | "Misto";

export interface ILessonAttachment {
  name: string;
  url: string;
  type?: string;
}

export interface ILessonMetrics {
  views: number;
  starts: number;
  completions: number;
  dropouts: number;
  averageProgress: number;
  averageScore: number;
  averageCompletionTimeMinutes: number;
  averageWatchTimeMinutes: number;
  lastAccessAt?: Timestamp;
}

export interface IChangeLogEntry {
  version: number;
  data: Partial<ILesson>;
  updatedAt: Timestamp;
}

export interface ILesson {
  id?: string;
  moduleId: string;

  title: string;
  slug?: string;
  shortDescription?: string;
  summary?: string;

  content: IBlock[];

  sequence: number;
  status: TStatus;
  level?: TLevel;
  type?: LessonType;
  category?: string;
  tags?: string[];

  prerequisiteLessonIds: string[];

  completionRewardIds?: string[];

  videoUrl?: string;
  thumbnailUrl?: string;
  attachments?: ILessonAttachment[];

  durationInMinutes?: number;
  estimatedMinutes?: number;
  readingTimeMinutes?: number;

  hasVideo?: boolean;
  hasText?: boolean;
  hasAttachments?: boolean;

  published: boolean;
  publishedAt?: Timestamp;
  unpublishedAt?: Timestamp;
  archived?: boolean;
  featured?: boolean;
  visibility?: TVisibility;

  createdBy?: string;
  updatedBy?: string;
  responsibleInstructorId?: string;
  version?: number;
  changeLog?: IChangeLogEntry[];

  metrics?: ILessonMetrics;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
  currentVersionId: string;
}

export interface ILesson2 {
  id: string;
  moduleId: string;
  sequence: number;
  currentVersionId?: string;
  publishedVersionId?: string;
  hasDraft?: boolean;
  versionsCount?: number;
  completionRewardIds?: string[];
  status:
    | "disponivel"
    | "indisponivel"
    | "em_construcao"
    | "em_revisao"
    | "em_edicao";
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface ILessonVersion2 {
  id: string;
  lessonId: string;
  version: number;
  status: "rascunho" | "publicada";
  title: string;
  slug?: string;
  summary?: string;
  content: IBlock[];
  type?: LessonType;
  tags?: string[];
  delivery?: "content" | "practice";
  practice?: {
    type: "simulation" | "game";
    targetId: string;
    targetSlug?: string;
    instructions?: string;
    minimumScore?: number;
    completionMode: "completed" | "minimum_score";
  };
  assessmentId?: string;
  prerequisiteLessonIds: string[];
  durationInMinutes?: number;
  visibility?: "publica" | "privada" | "restrita";
  publishedAt?: Timestamp;
  publishedBy?: string;
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
