import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { pedagogicalAnalyticsService } from "./pedagogical-analytics.service";

export const getMyPedagogicalAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const rawWeeks = Number(req.query.weeks ?? 8);

    const data = await pedagogicalAnalyticsService.getForUser(userId, rawWeeks);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Erro ao carregar analytics pedagógico:", error);

    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Não foi possível carregar o analytics pedagógico.",
    });
  }
};
