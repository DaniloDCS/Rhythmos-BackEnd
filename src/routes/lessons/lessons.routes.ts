import { Router } from "express";
import {
  getPublishedLessons,
  getLessonsByModule,
  getAccessibleLessonsByModule,
  getLessonById,
  startLesson,
  completeLesson,
} from "../../controllers/Lesson.controller";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";

export const LessonsRoutes = Router();

// Lessons globais
LessonsRoutes.get("/:id", verifyFirebaseToken, getLessonById);
// LessonsRoutes.get("/lessons/published", getPublishedLessons);

// Lessons dentro de módulos
LessonsRoutes.get("/modules/:moduleId/lessons", getLessonsByModule);
LessonsRoutes.get(
  "/modules/:moduleId/lessons/accessible",
  getAccessibleLessonsByModule,
);

// Ações do usuário na lesson
LessonsRoutes.post("/lessons/:id/start", startLesson);
LessonsRoutes.post(
  "/lessons/:id/complete",
  verifyFirebaseToken,
  completeLesson,
);
