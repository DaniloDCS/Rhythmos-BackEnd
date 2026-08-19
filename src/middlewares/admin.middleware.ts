import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";
import { db } from "../config/firebase";
import { hasPermission } from "../security/permissions";

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const uid = req.user.uid;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Usuário não encontrado.",
      });
    }

    const user = userDoc.data();

    if (!hasPermission(user?.role, "admin.access")) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Acesso restrito aos administradores.",
      });
    }

    return next();
  } catch (error) {
    console.error("Erro ao validar administrador:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Erro ao verificar permissões do usuário.",
    });
  }
};
