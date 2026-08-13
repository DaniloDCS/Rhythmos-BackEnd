import { Router } from "express";
import { withAdmin } from "../../middlewares/withAdmin";
import {
  createUser,
  getAllUsers,
  getUserById,
  userUpdate,
  deleteUserByAdmin,
} from "../../controllers/user.controller";

export const AdminUserRoutes = Router();

AdminUserRoutes.get("/users", ...withAdmin(getAllUsers));
AdminUserRoutes.post("/user/create", ...withAdmin(createUser));
AdminUserRoutes.get("/user/:id", ...withAdmin(getUserById));
AdminUserRoutes.put("/user/:id", ...withAdmin(userUpdate));
AdminUserRoutes.delete("/users/:id", ...withAdmin(deleteUserByAdmin));
