import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import type { IHeatmap, IHeatmapDays } from "./heatmap.interfaces";
import type { HeatmapDate, HeatmapLevel } from "./heatmap.types";
import { cp } from "fs";

const USERS_COLLECTION = "users";

export class HeatmapRepository {
  private getRef(userId: string, year: number) {
    return db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection("heatmaps")
      .doc(String(year));
  }

  async get(userId: string, year: number): Promise<IHeatmap> {
    const ref = this.getRef(userId, year);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return this.empty(userId, year);
    }

    return this.fromFirestore(snapshot.id, snapshot.data());
  }

  async incrementDay(
    userId: string,
    date: HeatmapDate,
    amount = 1,
  ): Promise<IHeatmap> {
    if (!userId?.trim()) {
      throw new Error("userId é obrigatório.");
    }

    if (!this.isValidDateKey(date)) {
      throw new Error("Data inválida. Use YYYY-MM-DD.");
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("amount deve ser um inteiro positivo.");
    }

    const year = Number(date.slice(0, 4));
    const ref = this.getRef(userId, year);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      const current = snapshot.exists
        ? this.fromFirestore(snapshot.id, snapshot.data())
        : this.empty(userId, year);

      const previousDay = current.days[date];
      const newValue = Number(previousDay?.value ?? 0) + amount;

      const days: IHeatmapDays = {
        ...current.days,
        [date]: {
          value: newValue,
          level: this.calculateLevel(newValue),
        },
      };

      const { streak, longestStreak } = this.calculateStreaks(days);

      const payload = {
        userId,
        year,
        total: Number(current.total ?? 0) + amount,
        streak,
        longestStreak,
        days,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (snapshot.exists) {
        transaction.set(ref, payload, { merge: true });
      } else {
        transaction.set(ref, {
          ...payload,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return this.get(userId, year);
  }

  private calculateLevel(value: number): HeatmapLevel {
    if (value <= 0) return 0;
    if (value === 1) return 1;
    if (value <= 3) return 2;
    if (value <= 6) return 3;
    if (value <= 10) return 4;
    return 5;
  }

  private calculateStreaks(days: IHeatmapDays) {
    const activeDates = Object.entries(days)
      .filter(([, item]) => Number(item?.value ?? 0) > 0)
      .map(([date]) => date as HeatmapDate)
      .sort();

    if (!activeDates.length) {
      return {
        streak: 0,
        longestStreak: 0,
      };
    }

    let currentRun = 1;
    let longestStreak = 1;

    for (let index = 1; index < activeDates.length; index += 1) {
      const previous = activeDates[index - 1];
      const current = activeDates[index];

      if (this.diffDays(previous, current) === 1) {
        currentRun += 1;
      } else {
        currentRun = 1;
      }

      longestStreak = Math.max(longestStreak, currentRun);
    }

    return {
      streak: currentRun,
      longestStreak,
    };
  }

  private diffDays(from: HeatmapDate, to: HeatmapDate) {
    return Math.round(
      (this.dateKeyToUtc(to) - this.dateKeyToUtc(from)) / 86_400_000,
    );
  }

  private dateKeyToUtc(date: HeatmapDate) {
    const [year, month, day] = date.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  }

  private isValidDateKey(value: string): value is HeatmapDate {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  private empty(userId: string, year: number): IHeatmap {
    return {
      id: String(year),
      userId,
      year,
      total: 0,
      streak: 0,
      longestStreak: 0,
      days: {},
      createdAt: null,
      updatedAt: null,
    };
  }

  private fromFirestore(id: string, data?: DocumentData): IHeatmap {
    return {
      id,
      userId: String(data?.userId ?? ""),
      year: Number(data?.year ?? Number(id)),
      total: Number(data?.total ?? 0),
      streak: Number(data?.streak ?? 0),
      longestStreak: Number(data?.longestStreak ?? 0),
      days: (data?.days ?? {}) as IHeatmapDays,
      createdAt:
        data?.createdAt instanceof Timestamp
          ? data.createdAt
          : (data?.createdAt ?? null),
      updatedAt:
        data?.updatedAt instanceof Timestamp
          ? data.updatedAt
          : (data?.updatedAt ?? null),
    };
  }
}
