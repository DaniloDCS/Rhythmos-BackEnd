import { Router } from "express";
import {
  createLesson,
  getAllLessons,
  updateLesson,
  publishLesson,
  unpublishLesson,
  archiveLesson,
  unarchiveLesson,
  deleteLesson,
  patchLesson,
  patchDraft,
  getLessonVersions,
  restoreLessonVersion,
} from "./admin.lesson.controller";
import { withAdmin } from "../../middlewares/with-admin";

export const AdminLessonsRoutes = Router();

AdminLessonsRoutes.route("/lessons")
  .get(...withAdmin(getAllLessons))
  .post(...withAdmin(createLesson));

AdminLessonsRoutes.get(
  "/lessons/:id/versions",
  ...withAdmin(getLessonVersions),
);
AdminLessonsRoutes.post(
  "/lessons/:id/versions/:versionId/restore",
  ...withAdmin(restoreLessonVersion),
);
AdminLessonsRoutes.route("/lessons/:id")
  .put(...withAdmin(updateLesson))
  .delete(...withAdmin(deleteLesson));
AdminLessonsRoutes.patch("/draft/:id", ...withAdmin(patchDraft));
AdminLessonsRoutes.patch("/lessons/:id", ...withAdmin(patchLesson));
AdminLessonsRoutes.patch("/lessons/:id/publish", ...withAdmin(publishLesson));
AdminLessonsRoutes.patch(
  "/lessons/:id/unpublish",
  ...withAdmin(unpublishLesson),
);
AdminLessonsRoutes.patch("/lessons/:id/archive", ...withAdmin(archiveLesson));
AdminLessonsRoutes.patch(
  "/lessons/:id/unarchive",
  ...withAdmin(unarchiveLesson),
);
