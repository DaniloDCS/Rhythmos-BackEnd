import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import {
  getMyTrailFeedback,
  submitTrailFeedback,
} from "../../controllers/TrailFeedback.controller";

export const TrailFeedbackRoutes = Router();

TrailFeedbackRoutes.post(
  "/trails/:trailId/feedback",
  verifyFirebaseToken,
  submitTrailFeedback,
);

TrailFeedbackRoutes.get(
  "/trails/:trailId/feedback/me",
  verifyFirebaseToken,
  getMyTrailFeedback,
);
