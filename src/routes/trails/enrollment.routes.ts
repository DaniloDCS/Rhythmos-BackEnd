// import { Router } from "express";
// import {
//   completeLesson,
//   getEnrollment,
//   getMyEnrollments,
//   patchEnrollment,
//   registerEnrollment,
// } from "../../controllers/Enrollment/enrollment.controller";
// import { verifyFirebaseToken } from "../../middlewares/authMiddleware";

// export const EnrollmentsRoutes = Router();

// EnrollmentsRoutes.post("/", verifyFirebaseToken, registerEnrollment);

// EnrollmentsRoutes.get("/", verifyFirebaseToken, getMyEnrollments);

// EnrollmentsRoutes.patch(
//   "/:id/lesson/conclude",
//   verifyFirebaseToken,
//   completeLesson,
// );

// EnrollmentsRoutes.get("/:id", verifyFirebaseToken, getEnrollment);

// EnrollmentsRoutes.patch("/:id", verifyFirebaseToken, patchEnrollment);

import { Router } from "express";
import {
  getEnrollment,
  getMyEnrollments,
  patchEnrollment,
  registerEnrollment,
} from "../../controllers/Enrollment/enrollment.controller";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import {
  completeLessonFlow,
  completePracticeFlow,
  getCurrentLearningStep,
} from "../../controllers/LearningFlow.controller";

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
