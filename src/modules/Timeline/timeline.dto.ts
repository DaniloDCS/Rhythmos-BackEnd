import type {
  TimelineLevel,
  TimelineTargetType,
  TimelineType,
} from "./Timeline.types";

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

export interface GetTimelineDTO {
  userId: string;

  limit?: number;
}
