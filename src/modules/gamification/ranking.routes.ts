import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { getGlobalRanking } from "./ranking.controller";

export const RankingRoutes = Router();
RankingRoutes.get("/global", verifyFirebaseToken, getGlobalRanking);
RankingRoutes.get("/me", verifyFirebaseToken, getGlobalRanking);
