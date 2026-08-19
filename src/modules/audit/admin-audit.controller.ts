import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { db } from "../../config/firebase";

export const listAdminAudit = async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const snapshot = await db.collection("admin_audit_logs").orderBy("createdAt", "desc").limit(500).get();
  const actor = String(req.query.actor ?? "").toLowerCase(); const entity = String(req.query.entity ?? "").toLowerCase(); const action = String(req.query.action ?? "").toLowerCase();
  const from = req.query.from ? new Date(String(req.query.from)) : null; const to = req.query.to ? new Date(String(req.query.to)) : null;
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() ?? null })).filter((item: any) => {
    const date = item.createdAt ? new Date(item.createdAt) : null;
    return (!actor || String(item.actorId ?? item.actorName ?? "").toLowerCase().includes(actor)) && (!entity || String(item.entityType).toLowerCase() === entity) && (!action || String(item.action).toLowerCase() === action) && (!from || (date && date >= from)) && (!to || (date && date <= to));
  }).slice(0, limit);
  res.json({ items, total: items.length, generatedAt: new Date().toISOString() });
};
