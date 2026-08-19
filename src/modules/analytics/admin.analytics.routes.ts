import { Router } from "express";
import { withAdmin } from "../../middlewares/with-admin";
import { getAdminAnalytics } from "./admin.analytics.controller";

export const AdminAnalyticsRoutes = Router();

AdminAnalyticsRoutes.get("/", ...withAdmin(getAdminAnalytics));
