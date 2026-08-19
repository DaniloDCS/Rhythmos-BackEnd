import { Router } from "express";
import { withAdmin } from "../../middlewares/with-admin";
import {
  createUser,
  getAllUsers,
  getUserById,
  userUpdate,
  deleteUserByAdmin,
  getUserLearningHistory,
} from "./admin.user.controller";
import { getRegistrationStatus, updateRegistrationStatus } from "./user.controller";

export const AdminUserRoutes = Router();

AdminUserRoutes.get("/users", ...withAdmin(getAllUsers));
AdminUserRoutes.get("/users/:id/learning-history", ...withAdmin(getUserLearningHistory));
AdminUserRoutes.get("/users/registration-settings", ...withAdmin(getRegistrationStatus));
AdminUserRoutes.patch("/users/registration-settings", ...withAdmin(updateRegistrationStatus));
AdminUserRoutes.post("/user/create", ...withAdmin(createUser));
AdminUserRoutes.get("/user/:id", ...withAdmin(getUserById));
AdminUserRoutes.put("/user/:id", ...withAdmin(userUpdate));
AdminUserRoutes.delete("/users/:id", ...withAdmin(deleteUserByAdmin));
