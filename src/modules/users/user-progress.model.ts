import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { IUserProgress } from "./user-progress.types";
import { allUserGamificationQuery, userGamificationRef } from "../gamification/user-gamification.repository";

export class UserProgressModel {
  static async create(data: IUserProgress) {
    const ref = userGamificationRef(data.userId);

    const payload: IUserProgress = {
      ...data,
      id: data.userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await ref.set(payload);
    return payload;
  }

  static async getById(userId: string) {
    const doc = await userGamificationRef(userId).get();

    if (!doc.exists) return null;

    return doc.data() as IUserProgress;
  }

  static async getAll() {
    const snapshot = await allUserGamificationQuery().get();
    return snapshot.docs.map((doc) => doc.data() as IUserProgress);
  }

  static async getByUserId(userId: string) {
    return this.getById(userId);
  }

  static async update(userId: string, data: Partial<IUserProgress>) {
    const ref = userGamificationRef(userId);

    await ref.update({
      ...data,
      updatedAt: Timestamp.now(),
    });

    const updated = await ref.get();

    return updated.data() as IUserProgress;
  }

  static async delete(userId: string) {
    await userGamificationRef(userId).delete();
    return true;
  }
}
