import { Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";

export interface AuditChange {
  field: string;
  previous?: unknown;
  current?: unknown;
}

export interface AdminAuditInput {
  trailId?: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  request?: { method?: string; path?: string; ip?: string; userAgent?: string; requestId?: string };
  outcome?: "success" | "failure";
  statusCode?: number;
}

const sensitive = /password|token|authorization|secret|cookie|credential/i;
export const sanitizeAuditValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitizeAuditValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !sensitive.test(key)).map(([key, item]) => [key, sanitizeAuditValue(item)]));
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  return value;
};

export const recordAdminAudit = async (input: AdminAuditInput) => {
  const ref = db.collection("admin_audit_logs").doc();
  await ref.set({
    id: ref.id,
    ...input,
    changes: sanitizeAuditValue(input.changes ?? []),
    metadata: sanitizeAuditValue(input.metadata ?? {}),
    createdAt: Timestamp.now(),
  });
};

export const recordTrailAudit = (input: AdminAuditInput & { trailId: string }) =>
  recordAdminAudit({ ...input, outcome: input.outcome ?? "success" });
