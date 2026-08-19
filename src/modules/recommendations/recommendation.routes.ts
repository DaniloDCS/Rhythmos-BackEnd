import { Router } from "express"; import { verifyFirebaseToken } from "../../middlewares/auth.middleware"; import { getMyRecommendations } from "./recommendation.controller";
export const RecommendationRoutes = Router(); RecommendationRoutes.get("/", verifyFirebaseToken, getMyRecommendations);
