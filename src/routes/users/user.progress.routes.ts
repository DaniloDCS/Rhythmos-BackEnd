import { Router } from "express";
import {
  MyProgress,
  ProgressAddXp,
  ProgressRegisterActivity,
} from "../../controllers/UserProgress.controller";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";

export const UserProgressRoutes = Router();

UserProgressRoutes.get("/", verifyFirebaseToken, MyProgress);

UserProgressRoutes.patch("/xp", verifyFirebaseToken, ProgressAddXp);

UserProgressRoutes.patch(
  "/activity",
  verifyFirebaseToken,
  ProgressRegisterActivity,
);
