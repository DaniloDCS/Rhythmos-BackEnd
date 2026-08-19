import { Router } from "express";
import {
  MyProgress,
  ProgressAddXp,
  ProgressRegisterActivity,
} from "./user-progress.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const UserProgressRoutes = Router();

UserProgressRoutes.get("/", verifyFirebaseToken, MyProgress);

UserProgressRoutes.patch("/xp", verifyFirebaseToken, ProgressAddXp);

UserProgressRoutes.patch(
  "/activity",
  verifyFirebaseToken,
  ProgressRegisterActivity,
);
