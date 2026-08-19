import { Router } from "express";
import {
  getLessonsByModule,
  getAccessibleLessonsByModule,
  getLessonById,
  startLesson,
  completeLesson,
} from "./lesson.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const LessonsRoutes = Router();

LessonsRoutes.get("/:id", verifyFirebaseToken, getLessonById);

LessonsRoutes.get("/modules/:moduleId/lessons", getLessonsByModule);
LessonsRoutes.get(
  "/modules/:moduleId/lessons/accessible",
  getAccessibleLessonsByModule,
);

LessonsRoutes.post("/lessons/:id/start", startLesson);
LessonsRoutes.post(
  "/lessons/:id/complete",
  verifyFirebaseToken,
  completeLesson,
);
