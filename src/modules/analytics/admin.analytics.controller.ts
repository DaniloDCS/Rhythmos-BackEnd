import type { Request, Response } from "express";

import { db } from "../../config/firebase";

export const getAdminAnalytics = async (_req: Request, res: Response) => {
  try {
    const doc = await db.collection("analyticsAdmin").doc("latest").get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Analytics Admin não encontrado",
      });
    }

    return res.status(200).json(doc.data());
  } catch (error) {
    console.error("Erro ao buscar Analytics Admin:", error);
    return res.status(500).json({
      message: "Erro ao buscar Analytics Admin",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
