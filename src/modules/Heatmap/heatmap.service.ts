import { HeatmapRepository } from "./heatmap.repository";
import type { HeatmapDate } from "./heatmap.types";

const DEFAULT_TIMEZONE =
  process.env.APP_TIMEZONE?.trim() || "America/Sao_Paulo";

const repository = new HeatmapRepository();

export const getHeatmapDateKey = (
  date = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): HeatmapDate => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}` as HeatmapDate;
};

export class HeatmapService {
  get(userId: string, year: number) {
    return repository.get(userId, year);
  }

  recordActivity(
    userId: string,
    options?: {
      date?: HeatmapDate;
      amount?: number;
    },
  ) {
    const date = options?.date ?? getHeatmapDateKey();
    const amount = options?.amount ?? 1;
    console.log({ date, amount });

    return repository.incrementDay(userId, date, amount);
  }
}

export const heatmapService = new HeatmapService();
