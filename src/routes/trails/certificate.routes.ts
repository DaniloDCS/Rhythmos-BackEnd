import { Router } from "express";

import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import {
  generateCertificate,
  getCertificate,
  getMyCertificates,
  validateCertificate,
} from "../../controllers/Enrollment/certificate.controller";

export const CertificatesRoutes = Router();

/*
 * Rota pública para validar pelo ID.
 * Deve ficar antes de "/:id".
 */
CertificatesRoutes.get("/validate/:id", validateCertificate);

CertificatesRoutes.get("/", verifyFirebaseToken, getMyCertificates);

CertificatesRoutes.post(
  "/enrollment/:enrollmentId",
  verifyFirebaseToken,
  generateCertificate,
);

CertificatesRoutes.get("/:id", verifyFirebaseToken, getCertificate);
