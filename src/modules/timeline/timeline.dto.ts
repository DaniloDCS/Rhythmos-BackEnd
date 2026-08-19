import type {
  TimelineLevel,
  TimelineTargetType,
  TimelineType,
} from "./timeline.types";

export interface CreateTimelineDTO {
  type: TimelineType;

  level?: TimelineLevel;

  title: string;

  description: string;

  userId: string;

  adminId?: string;

  xp?: number;

  targetId?: string;

  targetType?: TimelineTargetType;

  metadata?: Record<string, any>;

  icon?: string;

  color?: string;
}
