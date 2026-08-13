import type { Request, Response } from "express";

import { heatmapService } from "./heatmap.service";

export class HeatmapController {
  async get(req: Request, res: Response) {
    try {
      const userId = String(req.params.userId ?? "").trim();

      const year = Number(req.params.year);

      if (!userId) {
        return res.status(400).json({
          message: "userId é obrigatório.",
        });
      }

      if (!Number.isInteger(year)) {
        return res.status(400).json({
          message: "Ano inválido.",
        });
      }

      const heatmap = await heatmapService.get(userId, year);

      return res.status(200).json(heatmap);
    } catch (error) {
      console.error("[Heatmap] Erro GET:", error);

      return res.status(500).json({
        message: "Erro ao carregar heatmap.",
      });
    }
  }

  async record(req: Request, res: Response) {
    try {
      const userId = String(req.body?.userId ?? "").trim();

      if (!userId) {
        return res.status(400).json({
          message: "userId é obrigatório.",
        });
      }

      const heatmap = await heatmapService.recordActivity(userId);

      console.log("[Heatmap] Registro concluído:", {
        userId,
        total: heatmap.total,
        days: heatmap.days,
      });

      return res.status(200).json(heatmap);
    } catch (error) {
      console.error("[Heatmap] Erro POST:", error);

      return res.status(500).json({
        message: "Erro ao registrar atividade no heatmap.",
      });
    }
  }
}
