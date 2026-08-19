import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

import {
  getPublishedTrails,
  getAccessibleTrailById,
  getAvailableTrailsForUser,
  getUserTrailsWithProgress,
  getTrailWithModulesAndLessons,
  getTrailProgrammaticContent,
} from "./trail.controller";

export const TrailRoutes = Router();

TrailRoutes.get("/", getPublishedTrails);

TrailRoutes.get("/available", getAvailableTrailsForUser);

TrailRoutes.get("/my-progress", verifyFirebaseToken, getUserTrailsWithProgress);

TrailRoutes.get(
  "/:id/program",
  verifyFirebaseToken,
  getTrailProgrammaticContent,
);

TrailRoutes.get(
  "/trail-with-modules-lessons/:id",
  getTrailWithModulesAndLessons,
);

TrailRoutes.get("/trail/:id", getAccessibleTrailById);
