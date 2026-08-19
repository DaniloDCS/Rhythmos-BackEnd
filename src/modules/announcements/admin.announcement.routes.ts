import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { requireAdmin } from "../../middlewares/admin.middleware";
import { createAnnouncementAdmin, deleteAnnouncementAdmin, listAnnouncementsAdmin, updateAnnouncementAdmin } from "./admin.announcement.controller";

export const AdminAnnouncementRoutes = Router();
AdminAnnouncementRoutes.use(verifyFirebaseToken, requireAdmin);
AdminAnnouncementRoutes.get("/", listAnnouncementsAdmin);
AdminAnnouncementRoutes.post("/", createAnnouncementAdmin);
AdminAnnouncementRoutes.put("/:id", updateAnnouncementAdmin);
AdminAnnouncementRoutes.patch("/:id", updateAnnouncementAdmin);
AdminAnnouncementRoutes.delete("/:id", deleteAnnouncementAdmin);
