import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { getMyFeedback, submitFeedback } from "./feedback.controller";
export const FeedbackRoutes = Router();
FeedbackRoutes.get("/mine", verifyFirebaseToken, getMyFeedback);
FeedbackRoutes.post("/", verifyFirebaseToken, submitFeedback);
