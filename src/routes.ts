import { Router } from "express";
import { adminRoutes } from "./admin.routes";
import { userRoutes } from "./user.routes";

export const routes = Router();

routes.use("/", userRoutes);
routes.use("/", adminRoutes);
