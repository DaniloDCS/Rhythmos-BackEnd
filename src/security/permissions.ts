export type AppRole = "administrador" | "usuario";
export type Permission = "admin.access" | "audit.read" | "users.manage" | "content.manage" | "gamification.manage" | "certificates.manage" | "privacy.self" | "learning.access";
export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  administrador: ["admin.access", "audit.read", "users.manage", "content.manage", "gamification.manage", "certificates.manage", "privacy.self", "learning.access"],
  usuario: ["privacy.self", "learning.access"],
};
export const normalizeRole = (value: unknown): AppRole => String(value ?? "").toLowerCase() === "administrador" ? "administrador" : "usuario";
export const hasPermission = (role: unknown, permission: Permission) => ROLE_PERMISSIONS[normalizeRole(role)].includes(permission);
