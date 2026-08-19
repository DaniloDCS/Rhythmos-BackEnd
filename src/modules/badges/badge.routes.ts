import { Router } from "express";

import { getActiveBadges, getMyBadges } from "./badge.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const BadgeRoutes = Router();

BadgeRoutes.get("/", getActiveBadges);
BadgeRoutes.get("/mine", verifyFirebaseToken, getMyBadges);
