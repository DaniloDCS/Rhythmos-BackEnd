import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./authMiddleware";
import { db } from "../config/firebase";

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const uid = req.user.uid;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    const user = userDoc.data();

    if (user?.role !== "administrador") {
      return res.status(403).json({
        message: "Acesso restrito aos administradores.",
      });
    }

    return next();
  } catch (error) {
    console.error("Erro ao validar administrador:", error);

    return res.status(500).json({
      message: "Erro ao verificar permissões do usuário.",
    });
  }
};
