import { db } from "../../config/firebase";

export interface RawGameHistory {
  id: string;
  userId: string;
  gameId?: string;
  gameName?: string;
  score?: number;
  timeSeconds?: number;
  correctAnswers?: number;
  totalAnswers?: number;
  won?: boolean;
  perfectRun?: boolean;
  pedagogicalEvidence?: unknown;
  completedAt?: unknown;
  createdAt?: unknown;
}

export interface RawLearningEvent {
  id: string;
  userId: string;
  type?: string;
  lessonId?: string | null;
  lessonName?: string | null;
  gameId?: string | null;
  gameName?: string | null;
  simulatorId?: string | null;
  simulatorName?: string | null;
  score?: number | null;
  correctAnswers?: number | null;
  totalAnswers?: number | null;
  attempt?: number | null;
  timeSeconds?: number | null;
  contentTags?: string[];
  competencyIds?: string[];
  pedagogicalEvidence?: unknown;
  metadata?: Record<string, unknown>;
  createdAt?: unknown;
}

export interface RawGameDefinition {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
}

export class PedagogicalAnalyticsRepository {
  async getGameHistory(
    userId: string,
  ): Promise<RawGameHistory[]> {
    const snapshot = await db
      .collection("game_history")
      .where("userId", "==", userId)
      .limit(2000)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<RawGameHistory, "id">),
    }));
  }

  async getLearningEvents(
    userId: string,
  ): Promise<RawLearningEvent[]> {
    const snapshot = await db
      .collection("learning_events")
      .where("userId", "==", userId)
      .limit(2000)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<RawLearningEvent, "id">),
    }));
  }

  async getGamesByIds(
    gameIds: string[],
  ): Promise<Map<string, RawGameDefinition>> {
    const ids = [
      ...new Set(
        gameIds
          .map((id) => id?.trim())
          .filter(
            (id): id is string =>
              Boolean(id),
          ),
      ),
    ];

    if (!ids.length) {
      return new Map();
    }

    const refs = ids.map((id) =>
      db.collection("games").doc(id),
    );

    const snapshots = await db.getAll(...refs);

    const map = new Map<
      string,
      RawGameDefinition
    >();

    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;

      map.set(snapshot.id, {
        id: snapshot.id,
        ...(snapshot.data() as Omit<
          RawGameDefinition,
          "id"
        >),
      });
    }

    return map;
  }
}

export const pedagogicalAnalyticsRepository =
  new PedagogicalAnalyticsRepository();
