import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { IXpActivityRule } from "./xp-activity-rule.types";

export const XP_ACTIVITY_RULES_COLLECTION = "xp_activity_rules";
const XP_ACTIVITY_HISTORY_COLLECTION = "xp_activity_history";

export const getXpActivityRule = async (key: string) => {
  const snapshot = await db
    .collection(XP_ACTIVITY_RULES_COLLECTION)
    .where("key", "==", key.trim().toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const document = snapshot.docs[0];
  return { id: document.id, ...document.data() } as IXpActivityRule;
};

/** Uses the configured rule when present, while preserving legacy XP until an
 * administrator creates the corresponding rule. An inactive rule intentionally
 * awards zero XP. */
export const resolveXpForActivity = async (key: string, fallbackXp: number) => {
  const rule = await getXpActivityRule(key);
  if (!rule) return { xp: Math.max(0, fallbackXp), rule: null };
  return { xp: rule.active ? Math.max(0, Number(rule.xp ?? 0)) : 0, rule };
};

export const resolveXpAwardForUser = async (
  key: string,
  fallbackXp: number,
  userId: string,
  sourceId?: string,
) => {
  const resolved = await resolveXpForActivity(key, fallbackXp);
  if (!resolved.rule || !resolved.rule.active || resolved.xp <= 0) {
    return { ...resolved, allowed: resolved.xp > 0, reason: resolved.rule?.active === false ? "inactive" : null };
  }

  const history = db.collection(XP_ACTIVITY_HISTORY_COLLECTION);
  if (!resolved.rule.repeatable) {
    let query = history.where("userId", "==", userId).where("ruleKey", "==", resolved.rule.key);
    if (sourceId) query = query.where("sourceId", "==", sourceId);
    if (!(await query.limit(1).get()).empty) return { ...resolved, xp: 0, allowed: false, reason: "not_repeatable" };
  }

  if (resolved.rule.dailyLimit) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const today = await history.where("userId", "==", userId).where("ruleKey", "==", resolved.rule.key).where("dateKey", "==", dateKey).get();
    if (today.size >= resolved.rule.dailyLimit) return { ...resolved, xp: 0, allowed: false, reason: "daily_limit" };
  }

  return { ...resolved, allowed: true, reason: null };
};

export const recordXpActivityAward = async (
  userId: string,
  key: string,
  xp: number,
  sourceId?: string,
) => {
  if (xp <= 0) return;
  await db.collection(XP_ACTIVITY_HISTORY_COLLECTION).add({
    userId,
    ruleKey: key,
    sourceId: sourceId ?? null,
    xp,
    dateKey: new Date().toISOString().slice(0, 10),
    createdAt: Timestamp.now(),
  });
};
