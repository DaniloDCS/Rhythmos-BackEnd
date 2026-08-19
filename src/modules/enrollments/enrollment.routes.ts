import { Router } from "express";
import {
  getEnrollment,
  getMyEnrollments,
  patchEnrollment,
  registerEnrollment,
} from "./enrollment.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import {
  completeLessonFlow,
  completePracticeFlow,
  getCurrentLearningStep,
} from "./learning-flow.controller";

export const EnrollmentsRoutes = Router();

EnrollmentsRoutes.post("/", verifyFirebaseToken, registerEnrollment);
EnrollmentsRoutes.get("/", verifyFirebaseToken, getMyEnrollments);

EnrollmentsRoutes.get("/:id/step", verifyFirebaseToken, getCurrentLearningStep);

EnrollmentsRoutes.patch(
  "/:id/lesson/conclude",
  verifyFirebaseToken,
  completeLessonFlow,
);

EnrollmentsRoutes.post(
  "/:id/practice/complete",
  verifyFirebaseToken,
  completePracticeFlow,
);

EnrollmentsRoutes.get("/:id", verifyFirebaseToken, getEnrollment);
EnrollmentsRoutes.patch("/:id", verifyFirebaseToken, patchEnrollment);
