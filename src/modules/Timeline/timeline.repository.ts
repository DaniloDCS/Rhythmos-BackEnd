import { db } from "../../config/firebase";

import admin from "firebase-admin";

import type { CreateTimelineDTO } from "./timeline.dto";

export class TimelineRepository {
  private collection = "users";

  async create(data: CreateTimelineDTO) {
    if (!data?.userId || typeof data.userId !== "string") {
      throw new Error("Invalid or missing userId");
    }

    const ref = db
      .collection(this.collection)
      .doc(data.userId)
      .collection("timeline");

    const activity = {
      ...data,
      level: data.level || "info",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const doc = await ref.add(activity);

    return {
      id: doc.id,
      ...activity,
    };
  }

  async getUserTimeline(userId: string, limit = 20) {
    const snapshot = await db
      .collection(this.collection)
      .doc(userId)
      .collection("timeline")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getAdminTimeline(limit = 50) {
    const snapshot = await db
      .collectionGroup("timeline")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async delete(userId: string, id: string) {
    await db
      .collection(this.collection)
      .doc(userId)
      .collection("timeline")
      .doc(id)
      .delete();
  }
}
