import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { pedagogicalAnalyticsService } from "./pedagogicalAnalytics.service";

export const getMyPedagogicalAnalytics =
  async (
    req: AuthenticatedRequest,
    res: Response,
  ) => {
    try {
      const userId = req.user?.uid;

      if (!userId) {
        return res.status(401).json({
          message: "Usuário não autenticado.",
        });
      }

      const rawWeeks = Number(
        req.query.weeks ?? 8,
      );

      const data =
        await pedagogicalAnalyticsService.getForUser(
          userId,
          rawWeeks,
        );

      return res.status(200).json(data);
    } catch (error) {
      console.error(
        "Erro ao carregar analytics pedagógico:",
        error,
      );

      return res.status(500).json({
        message:
          "Não foi possível carregar o analytics pedagógico.",
      });
    }
  };
