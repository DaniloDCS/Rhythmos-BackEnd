import { db } from "../../config/firebase";
import type { IUserProgress } from "../users/user-progress.types";

export const USER_GAMIFICATION_COLLECTION = "gamification";
export const USER_GAMIFICATION_DOCUMENT = "progress";

export const userGamificationRef = (userId: string) =>
  db.collection("users").doc(userId)
    .collection(USER_GAMIFICATION_COLLECTION)
    .doc(USER_GAMIFICATION_DOCUMENT);

export const allUserGamificationQuery = () =>
  db.collectionGroup(USER_GAMIFICATION_COLLECTION)
    .where("userId", ">", "");

export class UserGamificationRepository {
  static ref(userId: string) { return userGamificationRef(userId); }

  static async get(userId: string): Promise<IUserProgress | null> {
    const snapshot = await userGamificationRef(userId).get();
    return snapshot.exists ? snapshot.data() as IUserProgress : null;
  }

  static async set(userId: string, data: IUserProgress) {
    await userGamificationRef(userId).set({ ...data, userId });
  }

  static async update(userId: string, data: Partial<IUserProgress>) {
    await userGamificationRef(userId).update(data);
  }

  static async delete(userId: string) {
    await userGamificationRef(userId).delete();
  }
}
