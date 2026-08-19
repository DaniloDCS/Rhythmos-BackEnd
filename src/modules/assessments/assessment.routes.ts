import { Router } from "express";
import { getAssessment, submitAssessment } from "./assessment.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const AssessmentsRoutes = Router();

AssessmentsRoutes.get("/:id", verifyFirebaseToken, getAssessment);
AssessmentsRoutes.post("/:id/submit", verifyFirebaseToken, submitAssessment);
