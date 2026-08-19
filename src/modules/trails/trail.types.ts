import { Timestamp } from "firebase-admin/firestore";

import { TLevel, TStatus } from "../../shared/domain.types";

export interface ITrailMetrics {
  views: number;
  enrollments: number;
  starts: number;
  completions: number;
  dropouts: number;
  averageProgress: number;
  averageScore: number;
  averageCompletionTimeMinutes: number;
  lastAccessAt?: Timestamp;
}

export interface ITrail {
  id?: string;
  title: string;
  slug?: string;
  description: string;
  status: TStatus;
  enrollmentPolicy?: "open" | "closed";
  enrolledAccessPolicy?: "continue" | "paused";
  level?: TLevel;
  category?: string;
  tags?: string[];
  prerequisiteTrailIds: string[];
  order: number;
  thumbnailUrl?: string;
  workloadHours?: number;
  featured?: boolean;
  estimatedMinutes?: number;
  responsibleInstructorId?: string;
  version?: number;
  metrics?: ITrailMetrics;
  totalModules: number;
  totalLessons: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
