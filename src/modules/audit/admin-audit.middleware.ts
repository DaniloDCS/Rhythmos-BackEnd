import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { recordAdminAudit, sanitizeAuditValue } from "./admin-audit.service";

const entityFromPath = (path: string) => {
  if (path.includes("/users/registration-settings")) return "registration_settings";
  const segment = path.split("?")[0].split("/").filter(Boolean)[1] ?? "configuration";
  const aliases: Record<string, string> = { users: "user", games: "game", levels: "level", rewards: "reward", badges: "badge", certificates: "certificate", announcements: "announcement", trails: "trail", trail: "trail", knowledge: "knowledge", supports: "support", support: "support", "xp-activity-rules": "xp_rule", "laboratory-modules": "laboratory" };
  return aliases[segment] ?? segment.replace(/-/g, "_");
};
const actionFrom = (method: string, path: string, body?: Record<string, unknown>) => {
  if (path.includes("/users/registration-settings") && method === "PATCH") {
    return body?.allowNewRegistrations === true ? "registrations_opened" : body?.allowNewRegistrations === false ? "registrations_paused" : "registration_settings_updated";
  }
  const suffix = path.split("/").filter(Boolean).pop() ?? "";
  if (method === "POST") return suffix === "publish" ? "publish" : "create";
  if (method === "DELETE") return "delete";
  if (["PUT", "PATCH"].includes(method)) return ["publish", "status", "activate", "deactivate", "restore"].includes(suffix) ? suffix : "update";
  return method.toLowerCase();
};

export const auditAdminMutation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const startedAt = Date.now();
  res.on("finish", () => {
    const parts = req.originalUrl.split("?")[0].split("/").filter(Boolean);
    void recordAdminAudit({
      actorId: req.user?.uid ?? null, actorRole: req.user?.role ?? "administrador",
      action: actionFrom(req.method, req.originalUrl, req.body), entityType: entityFromPath(req.originalUrl), entityId: req.params.id ?? parts[2] ?? null,
      metadata: { body: sanitizeAuditValue(req.body), durationMs: Date.now() - startedAt },
      request: { method: req.method, path: req.originalUrl.split("?")[0], ip: req.ip, userAgent: req.get("user-agent"), requestId: res.getHeader("x-request-id")?.toString() },
      outcome: res.statusCode < 400 ? "success" : "failure", statusCode: res.statusCode,
    }).catch((error) => console.error("[audit] falha ao registrar evento", error));
  });
  next();
};
