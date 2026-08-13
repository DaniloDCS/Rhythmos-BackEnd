import { requireAdmin } from "./adminMiddleware";
import { verifyFirebaseToken } from "./authMiddleware";

export const withAdmin = (...handlers: any[]) => [
  verifyFirebaseToken,
  requireAdmin,
  ...handlers,
];
