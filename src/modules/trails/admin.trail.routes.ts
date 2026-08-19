import { Router } from "express";
import { withAdmin } from "../../middlewares/with-admin";
import {
  createTrail,
  deleteTrailAdmin,
  publishTrailAdmin,
  updateTrailAdmin,
  getModulesByTrail,
  getCompleteTrailByIdAdmin,
  simpleUpdateTrailAdmin,
  getCompleteTrailsAdmin,
  getTrailAnalyticsAdmin,
} from "./admin.trail.controller";

export const AdminTrailRoutes = Router();

AdminTrailRoutes.route("/trails")
  .post(...withAdmin(createTrail))
  .get(...withAdmin(getCompleteTrailsAdmin));

AdminTrailRoutes.get(
  "/trails/:id/analytics",
  ...withAdmin(getTrailAnalyticsAdmin),
);

AdminTrailRoutes.get(
  "/trail/modules/:trailId",
  ...withAdmin(getModulesByTrail),
);

AdminTrailRoutes.patch(
  "/trail/update/:id",
  ...withAdmin(simpleUpdateTrailAdmin),
);

AdminTrailRoutes.route("/trail/:id")
  .get(...withAdmin(getCompleteTrailByIdAdmin))
  .put(...withAdmin(updateTrailAdmin))
  .delete(...withAdmin(deleteTrailAdmin));

AdminTrailRoutes.patch("/trails/:id/publish", ...withAdmin(publishTrailAdmin));
