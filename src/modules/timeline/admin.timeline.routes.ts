import { Router } from "express";

import { TimelineController } from "./admin.timeline.controller";

import { withAdmin } from "../../middlewares/with-admin";

export const AdminTimelineRoutes = Router();

const controller = new TimelineController();

AdminTimelineRoutes.get("/admin", ...withAdmin(controller.getAdminTimeline));
