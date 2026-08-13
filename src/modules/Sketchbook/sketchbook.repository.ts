import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type {
  ICreateSketchbookTab,
  ISketchbookTab,
  IUpdateSketchbookTab,
} from "./sketchbook.interface";

const SUBCOLLECTION = "sketchbook_tabs";

export class SketchbookRepository {
  private collection(userId: string) {
    return db
      .collection("users")
      .doc(userId)
      .collection(SUBCOLLECTION);
  }

  async list(userId: string): Promise<ISketchbookTab[]> {
    const snapshot = await this.collection(userId)
      .orderBy("order", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ISketchbookTab, "id">),
    }));
  }

  async getById(
    userId: string,
    tabId: string,
  ): Promise<ISketchbookTab | null> {
    const doc = await this.collection(userId).doc(tabId).get();

    if (!doc.exists) return null;

    return {
      id: doc.id,
      ...(doc.data() as Omit<ISketchbookTab, "id">),
    };
  }

  async create(
    userId: string,
    input: ICreateSketchbookTab & { order: number },
  ): Promise<ISketchbookTab> {
    const ref = this.collection(userId).doc();

    await ref.set({
      id: ref.id,
      title: input.title,
      color: input.color,
      content: input.content,
      order: input.order,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const created = await ref.get();

    return {
      id: created.id,
      ...(created.data() as Omit<ISketchbookTab, "id">),
    };
  }

  async update(
    userId: string,
    tabId: string,
    patch: IUpdateSketchbookTab,
  ): Promise<ISketchbookTab | null> {
    const ref = this.collection(userId).doc(tabId);
    const current = await ref.get();

    if (!current.exists) return null;

    await ref.update({
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();

    return {
      id: updated.id,
      ...(updated.data() as Omit<ISketchbookTab, "id">),
    };
  }

  async delete(userId: string, tabId: string): Promise<boolean> {
    const ref = this.collection(userId).doc(tabId);
    const current = await ref.get();

    if (!current.exists) return false;

    await ref.delete();
    return true;
  }
}

export const sketchbookRepository = new SketchbookRepository();
