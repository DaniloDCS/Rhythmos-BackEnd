import { Router } from "express";

import {
  createSupport,
  getSupportsByUser,
  getSupportById,
  replyToOwnSupport,
} from "./support.controller";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const SupportRoutes = Router();

SupportRoutes.post("/", createSupport);

SupportRoutes.get("/user/:userId", getSupportsByUser);

SupportRoutes.get("/:id", getSupportById);

SupportRoutes.put("/:id/reply", verifyFirebaseToken, replyToOwnSupport);
