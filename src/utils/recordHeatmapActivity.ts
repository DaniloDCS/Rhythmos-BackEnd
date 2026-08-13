// utils/recordHeatmapActivity.ts

import { heatmapService } from "../modules/Heatmap/heatmap.service";

export const recordHeatmapActivity = (userId?: string | null): void => {
  if (!userId) return;

  void heatmapService.recordActivity(userId).catch((error) => {
    console.error(
      `[Heatmap] Erro ao registrar atividade do usuário ${userId}:`,
      error,
    );
  });
};
