import { Router } from "express";

import { getAdminDashboard } from "../controllers/Dashboard.controller";
import { verifyFirebaseToken } from "../middlewares/authMiddleware";
import { requireAdmin } from "../middlewares/adminMiddleware";

const DashboardRoutes = Router();

DashboardRoutes.get(
  "/admin/dashboard",
  verifyFirebaseToken,
  requireAdmin,
  getAdminDashboard,
);

export default DashboardRoutes;
