import type { ITimeline } from "./timeline.interfaces";

export class TimelineModel implements ITimeline {
  id?: string;

  type: any;

  level: any;

  title: string;

  description: string;

  userId: string;

  adminId?: string;

  xp?: number;

  targetId?: string;

  targetType?: any;

  metadata?: Record<string, any>;

  icon?: string;

  color?: string;

  createdAt: Date;

  updatedAt?: Date;

  constructor(data: ITimeline) {
    this.id = data.id;

    this.type = data.type;

    this.level = data.level;

    this.title = data.title;

    this.description = data.description;

    this.userId = data.userId;

    this.adminId = data.adminId;

    this.xp = data.xp;

    this.targetId = data.targetId;

    this.targetType = data.targetType;

    this.metadata = data.metadata;

    this.icon = data.icon;

    this.color = data.color;

    this.createdAt = data.createdAt;

    this.updatedAt = data.updatedAt;
  }
}
