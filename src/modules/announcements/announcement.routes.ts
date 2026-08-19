import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { listActiveAnnouncements } from "./announcement.controller";

export const AnnouncementRoutes = Router();

AnnouncementRoutes.get("/", verifyFirebaseToken, listActiveAnnouncements);
