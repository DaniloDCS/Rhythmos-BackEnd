import { Router } from "express";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import {
  generateCertificate,
  getCertificate,
  getMyCertificates,
  validateCertificate,
} from "./certificate.controller";

export const CertificatesRoutes = Router();

CertificatesRoutes.get("/validate/:id", validateCertificate);

CertificatesRoutes.get("/", verifyFirebaseToken, getMyCertificates);

CertificatesRoutes.post(
  "/enrollment/:enrollmentId",
  verifyFirebaseToken,
  generateCertificate,
);

CertificatesRoutes.get("/:id", verifyFirebaseToken, getCertificate);
