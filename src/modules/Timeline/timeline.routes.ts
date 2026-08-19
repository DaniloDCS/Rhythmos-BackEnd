import { Router } from "express";

import { TimelineController } from "./timeline.controller";

export const timelineRouter = Router();

const controller = new TimelineController();

timelineRouter.post("/", controller.create);

timelineRouter.get("/user/:userId", controller.getUserTimeline);

timelineRouter.delete("/:userId/:id", controller.delete);
