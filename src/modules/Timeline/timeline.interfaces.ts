import type {
  TimelineLevel,
  TimelineTargetType,
  TimelineType,
} from "./timeline.types";

export interface ITimelineMetadata {
  [key: string]: any;
}

export interface ITimeline {
  id?: string;

  type: TimelineType;

  level: TimelineLevel;

  title: string;

  description: string;

  userId: string;

  adminId?: string;

  xp?: number;

  targetId?: string;

  targetType?: TimelineTargetType;

  metadata?: ITimelineMetadata;

  icon?: string;

  color?: string;

  createdAt: Date;

  updatedAt?: Date;
}
