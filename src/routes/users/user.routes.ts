import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import {
  addProfileView,
  createUser,
  getBasicUser,
  getDashboard,
  getUserById,
  getUserProgress,
  userUpdate,
} from "../../controllers/user.controller";

export const UserRoutes = Router();

UserRoutes.get("/user/:info", getBasicUser);
UserRoutes.get("/progress/:userId", getUserProgress);
UserRoutes.post("/signup", createUser);
UserRoutes.post("/update", userUpdate);
UserRoutes.patch("/visit", addProfileView);

// Rota privada
UserRoutes.get("/me", verifyFirebaseToken, getUserById);
UserRoutes.get("/dashboard", verifyFirebaseToken, getDashboard);
