import { Router } from "express";
import {
  MyProgress,
  ProgressRegisterActivity,
} from "./user-progress.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const UserProgressRoutes = Router();

UserProgressRoutes.get("/", verifyFirebaseToken, MyProgress);

UserProgressRoutes.patch(
  "/activity",
  verifyFirebaseToken,
  ProgressRegisterActivity,
);
