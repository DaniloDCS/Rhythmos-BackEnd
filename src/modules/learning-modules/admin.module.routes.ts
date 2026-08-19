import { Router } from "express";
import {
  createModule,
  getAllModules,
  getModulesByTrail,
  updateModule,
  deleteModule,
  getLessonsByModule,
} from "./admin.module.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { requireAdmin } from "../../middlewares/admin.middleware";

export const AdminModulesRoutes = Router();

AdminModulesRoutes.get(
  "/modules/trails/:trailId/modules",
  verifyFirebaseToken,
  requireAdmin,
  getModulesByTrail,
);

AdminModulesRoutes.get(
  "/module/lessons/:id",
  verifyFirebaseToken,
  requireAdmin,
  getLessonsByModule,
);

AdminModulesRoutes.get(
  "/modules",
  verifyFirebaseToken,
  requireAdmin,
  getAllModules,
);

AdminModulesRoutes.post(
  "/modules",
  verifyFirebaseToken,
  requireAdmin,
  createModule,
);

AdminModulesRoutes.put(
  "/modules/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateModule,
);

AdminModulesRoutes.patch(
  "/modules/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateModule,
);

AdminModulesRoutes.delete(
  "/modules/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteModule,
);
