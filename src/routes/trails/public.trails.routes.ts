import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import {
  getPublishedTrails,
  getAccessibleTrailById,
  getAvailableTrailsForUser,
  getUserTrailsWithProgress,
  getTrailWithModulesAndLessons,
} from "../../controllers/Trails.controller";

export const PublicTrailsRoutes = Router();

PublicTrailsRoutes.get("/", getPublishedTrails);
PublicTrailsRoutes.get("/trail/:id", getAccessibleTrailById);
PublicTrailsRoutes.get(
  "/trail-with-modules-lessons/:id",
  getTrailWithModulesAndLessons,
);
PublicTrailsRoutes.get("/available", getAvailableTrailsForUser);
PublicTrailsRoutes.get(
  "/my-progress",
  verifyFirebaseToken,
  getUserTrailsWithProgress,
);
