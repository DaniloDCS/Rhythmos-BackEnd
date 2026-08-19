import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import { acceptPrivacy, cancelAccountDeletion, exportMyData, getCurrentPolicy, getPrivacyStatus, requestAccountDeletion, revokeSessions } from "./privacy.controller";
export const PrivacyRoutes = Router(); PrivacyRoutes.get("/policy/current", getCurrentPolicy); PrivacyRoutes.use(verifyFirebaseToken);
PrivacyRoutes.get("/", getPrivacyStatus); PrivacyRoutes.post("/consent", acceptPrivacy); PrivacyRoutes.get("/export", exportMyData); PrivacyRoutes.post("/deletion", requestAccountDeletion); PrivacyRoutes.delete("/deletion", cancelAccountDeletion); PrivacyRoutes.post("/sessions/revoke", revokeSessions);
