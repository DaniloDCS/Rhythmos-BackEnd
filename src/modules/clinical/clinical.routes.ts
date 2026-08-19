import { Router } from "express";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

import { ClinicalController } from "./clinical.controller";

export const ClinicalRoutes = Router();

const controller = new ClinicalController();

ClinicalRoutes.get("", verifyFirebaseToken, controller.list.bind(controller));

ClinicalRoutes.post(
  "/:id/answer",
  verifyFirebaseToken,
  controller.answer.bind(controller),
);
