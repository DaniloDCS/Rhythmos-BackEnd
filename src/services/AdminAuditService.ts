import { Timestamp } from "firebase-admin/firestore";

import { db } from "../config/firebase";

interface AuditChange {
  field: string;
  previous?: unknown;
  current?: unknown;
}

interface RecordTrailAuditInput {
  trailId: string;
  actorId?: string | null;
  action:
    | "trail_created"
    | "trail_updated"
    | "trail_published"
    | "trail_unpublished"
    | "trail_status_changed"
    | "trail_deleted"
    | "module_created"
    | "module_updated"
    | "module_deleted"
    | "lesson_created"
    | "lesson_updated"
    | "lesson_deleted"
    | "prerequisite_changed";
  entityType: "trail" | "module" | "lesson";
  entityId: string;
  changes?: AuditChange[];
}

export const recordTrailAudit = async (input: RecordTrailAuditInput) => {
  const ref = db.collection("admin_audit_logs").doc();
  await ref.set({
    id: ref.id,

    ...input,

    createdAt: Timestamp.now(),
  });
};
