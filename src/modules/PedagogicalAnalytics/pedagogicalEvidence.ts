import type { PedagogicalEvidenceDetail } from "./pedagogicalAnalytics.interface";

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

export const sanitizePedagogicalEvidence = (
  value: unknown,
): PedagogicalEvidenceDetail[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 100)
    .reduce<PedagogicalEvidenceDetail[]>((result, item) => {
      if (!item || typeof item !== "object") {
        return result;
      }

      const raw = item as Record<string, unknown>;

      const contentName = String(raw.contentName ?? raw.name ?? "")
        .trim()
        .slice(0, 120);

      if (!contentName) {
        return result;
      }

      const detail: PedagogicalEvidenceDetail = {
        contentName,
      };

      if (typeof raw.contentId === "string") {
        const contentId = raw.contentId.trim().slice(0, 120);

        if (contentId) {
          detail.contentId = contentId;
        }
      }

      if (Array.isArray(raw.competencyIds)) {
        const competencyIds = [
          ...new Set(
            raw.competencyIds
              .filter((id): id is string => typeof id === "string")
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        ].slice(0, 20);

        if (competencyIds.length > 0) {
          detail.competencyIds = competencyIds;
        }
      }

      if (typeof raw.correct === "boolean") {
        detail.correct = raw.correct;
      }

      const scoreValue = Number(raw.score);

      if (Number.isFinite(scoreValue)) {
        detail.score = clamp(scoreValue);
      }

      result.push(detail);

      return result;
    }, []);
};
