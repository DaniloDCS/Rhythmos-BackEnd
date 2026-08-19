import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import {
  addProfileView,
  createUser,
  getBasicUser,
  getDashboard,
  getUserById,
  getUserProgress,
  getRegistrationStatus,
  resolveLoginIdentifier,
  updateOwnUser,
} from "./user.controller";

export const UserRoutes = Router();

UserRoutes.get("/user/:info", getBasicUser);
UserRoutes.get("/progress/:userId", getUserProgress);
UserRoutes.post("/signup", createUser);
UserRoutes.get("/registration/status", getRegistrationStatus);
UserRoutes.post("/login/resolve", resolveLoginIdentifier);
UserRoutes.post("/update", verifyFirebaseToken, updateOwnUser);
UserRoutes.patch("/visit", addProfileView);

UserRoutes.get("/me", verifyFirebaseToken, getUserById);
UserRoutes.get("/dashboard", verifyFirebaseToken, getDashboard);
