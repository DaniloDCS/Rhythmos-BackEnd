import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { IUserProgress } from "../interfaces/IUserProgress";

const COLLECTION = "user_progress";

export class UserProgressModel {
  static async create(data: IUserProgress) {
    const ref = db.collection(COLLECTION).doc(data.userId);

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
    const doc = await db.collection(COLLECTION).doc(userId).get();

    if (!doc.exists) return null;

    return doc.data() as IUserProgress;
  }

  static async getAll() {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map((doc) => doc.data() as IUserProgress);
  }

  static async getByUserId(userId: string) {
    const snapshot = await db
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as IUserProgress;
  }

  static async update(userId: string, data: Partial<IUserProgress>) {
    const ref = db.collection(COLLECTION).doc(userId);

    await ref.update({
      ...data,
      updatedAt: Timestamp.now(),
    });

    const updated = await ref.get();

    return updated.data() as IUserProgress;
  }

  static async delete(userId: string) {
    await db.collection(COLLECTION).doc(userId).delete();
    return true;
  }
}
