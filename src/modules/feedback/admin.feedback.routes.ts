import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { requireAdmin } from "../../middlewares/admin.middleware";
import { listFeedbackAdmin } from "./admin.feedback.controller";
export const AdminFeedbackRoutes = Router();
AdminFeedbackRoutes.get("/", verifyFirebaseToken, requireAdmin, listFeedbackAdmin);
