import { requireAdmin } from "./admin.middleware";
import { verifyFirebaseToken } from "./auth.middleware";

export const withAdmin = (...handlers: any[]) => [
  verifyFirebaseToken,
  requireAdmin,
  ...handlers,
];
