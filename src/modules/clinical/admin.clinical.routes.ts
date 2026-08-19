import { Router } from "express";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

import { requireAdmin } from "../../middlewares/admin.middleware";

import { ClinicalController } from "./admin.clinical.controller";

export const AdminClinicalRoutes = Router();

const controller = new ClinicalController();

AdminClinicalRoutes.get(
  "/stats",
  verifyFirebaseToken,
  requireAdmin,
  controller.stats.bind(controller),
);

AdminClinicalRoutes.get(
  "",
  verifyFirebaseToken,
  requireAdmin,
  controller.listAdmin.bind(controller),
);

AdminClinicalRoutes.post(
  "",
  verifyFirebaseToken,
  requireAdmin,
  controller.create.bind(controller),
);

AdminClinicalRoutes.get(
  "/:id/attempts",
  verifyFirebaseToken,
  requireAdmin,
  controller.attempts.bind(controller),
);

AdminClinicalRoutes.get(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  controller.getAdmin.bind(controller),
);

AdminClinicalRoutes.put(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  controller.update.bind(controller),
);

AdminClinicalRoutes.patch(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  controller.update.bind(controller),
);

AdminClinicalRoutes.patch(
  "/:id/status",
  verifyFirebaseToken,
  requireAdmin,
  controller.status.bind(controller),
);

AdminClinicalRoutes.delete(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  controller.delete.bind(controller),
);
