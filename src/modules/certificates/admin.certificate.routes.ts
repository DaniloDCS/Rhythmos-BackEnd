import { Router } from "express";

import { requireAdmin } from "../../middlewares/admin.middleware";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import {
  getAllCertificatesAdmin,
  updateCertificateStatusAdmin,
} from "./admin.certificate.controller";

export const AdminCertificatesRoutes = Router();

AdminCertificatesRoutes.use(verifyFirebaseToken, requireAdmin);
AdminCertificatesRoutes.get("/", getAllCertificatesAdmin);
AdminCertificatesRoutes.patch("/:id/status", updateCertificateStatusAdmin);
