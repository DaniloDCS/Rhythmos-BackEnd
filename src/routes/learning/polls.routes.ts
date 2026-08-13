import { Router } from "express";
import { getPoll, votePoll } from "../../controllers/Poll.controller";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";

export const PollRoutes = Router();

PollRoutes.get(
  "/:lessonId/:versionId/:blockId",
  verifyFirebaseToken,
  getPoll,
);
PollRoutes.post(
  "/:lessonId/:versionId/:blockId/vote",
  verifyFirebaseToken,
  votePoll,
);
