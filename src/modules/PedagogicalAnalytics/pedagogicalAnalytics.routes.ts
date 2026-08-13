import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import { getMyPedagogicalAnalytics } from "./pedagogicalAnalytics.controller";

const PedagogicalAnalyticsRouter =
  Router();

PedagogicalAnalyticsRouter.get(
  "/me",
  verifyFirebaseToken,
  getMyPedagogicalAnalytics,
);

export default PedagogicalAnalyticsRouter;
