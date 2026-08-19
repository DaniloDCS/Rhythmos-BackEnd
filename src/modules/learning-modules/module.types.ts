import { Timestamp } from "firebase-admin/firestore";

import { TLevel, TStatus, TVisibility } from "../../shared/domain.types";

export interface IModuleMetrics {
  views: number;
  starts: number;
  completions: number;
  dropouts: number;
  averageProgress: number;
  averageScore: number;
  averageCompletionTimeMinutes: number;
  lastAccessAt?: Timestamp;
}

export interface IModule {
  id?: string;

  trailId: string;

  title: string;
  slug?: string;
  shortDescription?: string;
  description: string;

  sequence: number;
  status?: TStatus;
  level?: TLevel;
  category?: string;
  tags?: string[];

  published?: boolean;
  prerequisiteModuleIds?: string[];

  lessonIds?: string[];
  quizIds?: string[];
  activityIds?: string[];

  finalAssessmentId?: string;

  totalLessons?: number;
  totalQuizzes?: number;
  totalActivities?: number;

  estimatedMinutes?: number;
  workloadHours?: number;

  thumbnailUrl?: string;

  publishedAt?: Timestamp;
  unpublishedAt?: Timestamp;
  archived?: boolean;
  featured?: boolean;
  visibility?: TVisibility;

  createdBy?: string;
  updatedBy?: string;
  responsibleInstructorId?: string;
  version?: number;
  changeLog?: string;

  metrics?: IModuleMetrics;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
