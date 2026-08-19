import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { getMyPedagogicalAnalytics } from "./pedagogical-analytics.controller";

export const PedagogicalAnalyticsRouter = Router();

PedagogicalAnalyticsRouter.get(
  "/me",
  verifyFirebaseToken,
  getMyPedagogicalAnalytics,
);
