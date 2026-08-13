import { Router } from "express";
import {
  getAssessment,
  submitAssessment,
} from "../../controllers/Assessment.controller";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";

export const AssessmentsRoutes = Router();

AssessmentsRoutes.get("/:id", verifyFirebaseToken, getAssessment);
AssessmentsRoutes.post("/:id/submit", verifyFirebaseToken, submitAssessment);
