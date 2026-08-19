import { Router } from "express";

import { getAdminDashboard } from "./admin.dashboard.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { requireAdmin } from "../../middlewares/admin.middleware";

export const AdminDashboardRoutes = Router();

AdminDashboardRoutes.get(
  "",
  verifyFirebaseToken,
  requireAdmin,
  getAdminDashboard,
);
