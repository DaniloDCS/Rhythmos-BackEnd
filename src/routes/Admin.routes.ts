import { Router } from "express";
import { getAdminDashboard } from "../controllers/admin.controller";

const router = Router();

router.get("/admin/dashboard", getAdminDashboard);

export default router;
