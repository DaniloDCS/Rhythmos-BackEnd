import { Router } from "express";
import { cancelDeletionRequestAdmin, createPolicy, listDeletionRequests, listPolicies, publishPolicy } from "./admin-privacy-policy.controller";
export const AdminPrivacyPolicyRoutes = Router();
AdminPrivacyPolicyRoutes.get("/", listPolicies);
AdminPrivacyPolicyRoutes.post("/", createPolicy);
AdminPrivacyPolicyRoutes.patch("/:id/publish", publishPolicy);
AdminPrivacyPolicyRoutes.get("/deletion-requests/list", listDeletionRequests);
AdminPrivacyPolicyRoutes.patch("/deletion-requests/:id/cancel", cancelDeletionRequestAdmin);
