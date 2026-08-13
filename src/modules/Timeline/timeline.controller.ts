import type { Request, Response } from "express";

import { TimelineRepository } from "./timeline.repository";

const repository = new TimelineRepository();

export class TimelineController {
  async create(req: Request, res: Response) {
    const data = req.body;

    const timeline = await repository.create(data);

    return res.status(201).json({
      message: "Timeline criada",
      timeline,
    });
  }

  async getUserTimeline(req: Request, res: Response) {
    const { userId } = req.params;

    const limit = Number(req.query.limit) || 20;

    const timeline = await repository.getUserTimeline(userId, limit);

    return res.json(timeline);
  }

  async getAdminTimeline(req: Request, res: Response) {
    const limit = Number(req.query.limit) || 50;

    const timeline = await repository.getAdminTimeline(limit);

    return res.json(timeline);
  }

  async delete(req: Request, res: Response) {
    const { userId, id } = req.params;

    await repository.delete(userId, id);

    return res.json({
      message: "Timeline removida",
    });
  }
}
