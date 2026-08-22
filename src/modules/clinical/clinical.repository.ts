import type { DocumentData, Query } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { userGamificationRef } from "../gamification/user-gamification.repository";
import { ClinicalCaseModel } from "./clinical.model";
import type {
  IClinicalCase,
  IClinicalCaseAttempt,
  IClinicalCaseProgress,
} from "./clinical.types";

export const CLINICAL_CASES_COLLECTION = "clinical_cases";
export const CLINICAL_PROGRESS_COLLECTION = "clinical_case_progress";
export const CLINICAL_ATTEMPTS_COLLECTION = "clinical_case_attempts";

export const clinicalProgressId = (userId: string, caseId: string) =>
  `${userId}__${caseId}`;

const sanitize = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)) as T;
  }

  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitize(item)]),
    ) as T;
  }

  return value;
};

export class ClinicalRepository {
  caseRef(id: string) {
    return db.collection(CLINICAL_CASES_COLLECTION).doc(id);
  }

  progressRef(userId: string, caseId: string) {
    return db
      .collection(CLINICAL_PROGRESS_COLLECTION)
      .doc(clinicalProgressId(userId, caseId));
  }

  userProgressRef(userId: string) {
    return userGamificationRef(userId);
  }

  attemptRef() {
    return db.collection(CLINICAL_ATTEMPTS_COLLECTION).doc();
  }

  async getById(id: string): Promise<IClinicalCase | null> {
    const doc = await this.caseRef(id).get();
    if (!doc.exists) return null;
    return ClinicalCaseModel.fromFirestore(doc.id, doc.data()!);
  }

  async listPublished(): Promise<IClinicalCase[]> {
    const snapshot = await db
      .collection(CLINICAL_CASES_COLLECTION)
      .orderBy("sequence", "asc")
      .get();

    return snapshot.docs
      .map((doc) => ClinicalCaseModel.fromFirestore(doc.id, doc.data()))
      .filter((item) => item.status === "publicado");
  }

  async listAdmin(limit = 20, cursor?: string) {
    let query: Query<DocumentData> = db
      .collection(CLINICAL_CASES_COLLECTION)
      .orderBy("sequence", "asc")
      .limit(limit);

    if (cursor) {
      const cursorDoc = await this.caseRef(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snapshot = await query.get();
    const countSnapshot = await db
      .collection(CLINICAL_CASES_COLLECTION)
      .count()
      .get();
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return {
      data: snapshot.docs.map((doc) =>
        ClinicalCaseModel.fromFirestore(doc.id, doc.data()),
      ),
      nextCursor: lastVisible?.id ?? null,
      count: countSnapshot.data().count,
    };
  }

  async findBySequence(sequence: number, ignoreId?: string) {
    const snapshot = await db
      .collection(CLINICAL_CASES_COLLECTION)
      .where("sequence", "==", sequence)
      .limit(2)
      .get();

    const doc = snapshot.docs.find((item) => item.id !== ignoreId);
    return doc ? ClinicalCaseModel.fromFirestore(doc.id, doc.data()) : null;
  }

  async getCompletedCaseIds(userId: string): Promise<string[]> {
    const snapshot = await db
      .collection(CLINICAL_PROGRESS_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<IClinicalCaseProgress, "id">),
      }))
      .filter((item) => item.completed)
      .map((item) => item.caseId);
  }

  async hasProgressForCase(caseId: string) {
    const snapshot = await db
      .collection(CLINICAL_PROGRESS_COLLECTION)
      .where("caseId", "==", caseId)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  async listAttempts(caseId: string): Promise<IClinicalCaseAttempt[]> {
    const snapshot = await db
      .collection(CLINICAL_ATTEMPTS_COLLECTION)
      .where("caseId", "==", caseId)
      .get();

    const attempts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<IClinicalCaseAttempt, "id">),
    }));

    const millis = (value: unknown) => {
      if (
        value &&
        typeof (value as { toMillis?: () => number }).toMillis === "function"
      ) {
        return (value as { toMillis: () => number }).toMillis();
      }
      const time = new Date(String(value ?? "")).getTime();
      return Number.isFinite(time) ? time : 0;
    };

    return attempts.sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
  }

  async create(data: Omit<IClinicalCase, "id">) {
    const ref = db.collection(CLINICAL_CASES_COLLECTION).doc();
    await ref.set(sanitize({ id: ref.id, ...data }));
    return this.getById(ref.id);
  }

  async update(id: string, data: Partial<IClinicalCase>) {
    await this.caseRef(id).set(sanitize(data), { merge: true });
    return this.getById(id);
  }

  async delete(id: string) {
    await this.caseRef(id).delete();
  }

  async stats() {
    const snapshot = await db.collection(CLINICAL_CASES_COLLECTION).get();
    const cases = snapshot.docs.map((doc) =>
      ClinicalCaseModel.fromFirestore(doc.id, doc.data()),
    );

    return {
      total: cases.length,
      published: cases.filter((item) => item.status === "publicado").length,
      drafts: cases.filter((item) => item.status === "rascunho").length,
      archived: cases.filter((item) => item.status === "arquivado").length,
      attempts: cases.reduce(
        (sum, item) => sum + (item.metrics.attempts ?? 0),
        0,
      ),
      correctAttempts: cases.reduce(
        (sum, item) => sum + (item.metrics.correctAttempts ?? 0),
        0,
      ),
      completions: cases.reduce(
        (sum, item) => sum + (item.metrics.completions ?? 0),
        0,
      ),
    };
  }
}

export const clinicalRepository = new ClinicalRepository();
