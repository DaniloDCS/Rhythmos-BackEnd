import { Router } from "express";
import { getUserAnalytics } from "./analytics.controller";

export const AnalyticsRoutes = Router();

AnalyticsRoutes.get("/user/:userId", getUserAnalytics);
