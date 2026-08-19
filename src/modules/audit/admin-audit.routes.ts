import { Router } from "express";
import { listAdminAudit } from "./admin-audit.controller";
export const AdminAuditRoutes = Router();
AdminAuditRoutes.get("/", listAdminAudit);
