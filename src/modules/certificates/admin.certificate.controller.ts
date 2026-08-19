import { Timestamp } from "firebase-admin/firestore";
import type { Response } from "express";

import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import type {
  ICertificate,
  TCertificateStatus,
} from "./certificate.types";

const CERTIFICATES_COLLECTION = "certificates";

export const getAllCertificatesAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const requestedLimit = Number(req.query.limit ?? 50);
    const limit = Math.min(200, Math.max(1, requestedLimit));
    const snapshot = await db.collection(CERTIFICATES_COLLECTION).get();
    const certificates = snapshot.docs
      .map((doc) => ({
        ...(doc.data() as Omit<ICertificate, "id">),
        id: doc.id,
      }))
      .sort((a, b) => b.issuedAt.toMillis() - a.issuedAt.toMillis());

    return res.status(200).json({
      certificates: certificates.slice(0, limit),
      summary: {
        total: certificates.length,
        valid: certificates.filter((item) => item.status === "valido").length,
        revoked: certificates.filter((item) => item.status === "revogado")
          .length,
        issuedLast7Days: certificates.filter(
          (item) => item.issuedAt.toMillis() >= Date.now() - 7 * 86_400_000,
        ).length,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar certificados para administração:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Erro ao carregar certificados.",
    });
  }
};

export const updateCertificateStatusAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const certificateId = req.params.id;
    const status = req.body.status as TCertificateStatus;
    const reason = String(req.body.reason ?? "").trim();

    if (!certificateId || !["valido", "revogado"].includes(status)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Informe um certificado e um status válido.",
      });
    }
    if (status === "revogado" && !reason) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Informe o motivo da revogação.",
      });
    }

    const reference = db.collection(CERTIFICATES_COLLECTION).doc(certificateId);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Certificado não encontrado.",
      });
    }

    const update =
      status === "revogado"
        ? {
            status,
            revokedAt: Timestamp.now(),
            revokedBy: req.user?.uid ?? "admin",
            revocationReason: reason,
          }
        : {
            status,
            revokedAt: null,
            revokedBy: null,
            revocationReason: null,
          };
    await reference.update(update);

    return res.status(200).json({
      message:
        status === "revogado"
          ? "Certificado revogado com sucesso."
          : "Certificado reativado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao alterar certificado:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Erro ao alterar o certificado.",
    });
  }
};
