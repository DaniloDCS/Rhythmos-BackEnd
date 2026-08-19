import { Router } from "express";

import {
  getAllSupports,
  getSupportById,
  updateSupport,
  deleteSupport,
} from "./admin.support.controller";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

import { requireAdmin } from "../../middlewares/admin.middleware";

export const AdminSupportRoutes = Router();

AdminSupportRoutes.get(
  "/supports",
  verifyFirebaseToken,
  requireAdmin,
  getAllSupports,
);

AdminSupportRoutes.get(
  "/support/:id",
  verifyFirebaseToken,
  requireAdmin,
  getSupportById,
);

AdminSupportRoutes.put(
  "/support/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateSupport,
);

AdminSupportRoutes.delete(
  "/support/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteSupport,
);
