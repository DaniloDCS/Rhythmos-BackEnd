import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import { ClinicalController } from "./clinical.controller";

const ClinicalRoutes = Router();
const controller = new ClinicalController();

/* =========================
   USUÁRIO
========================= */
ClinicalRoutes.get(
  "/clinical-cases",
  verifyFirebaseToken,
  controller.list.bind(controller),
);

ClinicalRoutes.post(
  "/clinical-cases/:id/answer",
  verifyFirebaseToken,
  controller.answer.bind(controller),
);

/* =========================
   ADMIN
========================= */
ClinicalRoutes.get(
  "/admin/clinical-cases/stats",
  verifyFirebaseToken,
  controller.stats.bind(controller),
);

ClinicalRoutes.get(
  "/admin/clinical-cases",
  verifyFirebaseToken,
  controller.listAdmin.bind(controller),
);

ClinicalRoutes.post(
  "/admin/clinical-cases",
  verifyFirebaseToken,
  controller.create.bind(controller),
);

ClinicalRoutes.get(
  "/admin/clinical-cases/:id/attempts",
  verifyFirebaseToken,
  controller.attempts.bind(controller),
);

ClinicalRoutes.get(
  "/admin/clinical-cases/:id",
  verifyFirebaseToken,
  controller.getAdmin.bind(controller),
);

ClinicalRoutes.put(
  "/admin/clinical-cases/:id",
  verifyFirebaseToken,
  controller.update.bind(controller),
);

ClinicalRoutes.patch(
  "/admin/clinical-cases/:id",
  verifyFirebaseToken,
  controller.update.bind(controller),
);

ClinicalRoutes.patch(
  "/admin/clinical-cases/:id/status",
  verifyFirebaseToken,
  controller.status.bind(controller),
);

ClinicalRoutes.delete(
  "/admin/clinical-cases/:id",
  verifyFirebaseToken,
  controller.delete.bind(controller),
);

export default ClinicalRoutes;
