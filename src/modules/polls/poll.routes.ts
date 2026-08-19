import { Router } from "express";
import { getPoll, votePoll } from "./poll.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const PollRoutes = Router();

PollRoutes.get("/:lessonId/:versionId/:blockId", verifyFirebaseToken, getPoll);
PollRoutes.post(
  "/:lessonId/:versionId/:blockId/vote",
  verifyFirebaseToken,
  votePoll,
);
