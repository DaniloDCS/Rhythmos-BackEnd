import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { db } from "../../config/firebase";

const seen = new Map<string, number>();
export const recordUserSession = (req: AuthenticatedRequest) => {
  const uid = req.user?.uid; if (!uid) return;
  const userAgent = req.get("user-agent") ?? "desconhecido"; const ip = req.ip ?? "desconhecido";
  const id = createHash("sha256").update(`${uid}|${userAgent}|${ip}`).digest("hex").slice(0, 32);
  const key = `${uid}:${id}`; const now = Date.now(); if (now - (seen.get(key) ?? 0) < 5 * 60_000) return; seen.set(key, now);
  void db.collection("user_sessions").doc(key).set({ id, userId: uid, userAgent, ip, lastSeenAt: Timestamp.now(), active: true }, { merge: true }).catch(() => undefined);
};
