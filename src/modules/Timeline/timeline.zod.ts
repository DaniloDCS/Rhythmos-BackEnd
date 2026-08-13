import { z } from "zod";

export const createTimelineSchema = z.object({
  type: z.string(),

  level: z.enum(["info", "success", "warning", "danger"]).optional(),

  title: z.string(),

  description: z.string(),

  userId: z.string(),

  adminId: z.string().optional(),

  xp: z.number().optional(),

  targetId: z.string().optional(),

  targetType: z
    .enum(["trail", "module", "lesson", "quiz", "user", "achievement"])
    .optional(),

  metadata: z.record(z.string(), z.unknown()).optional(),

  icon: z.string().optional(),

  color: z.string().optional(),
});
