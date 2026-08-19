import { Router } from "express";

import {
  createReward,
  getAllRewardsAdmin,
  getRewardByIdAdmin,
  getRewardTargetsAdmin,
  updateRewardAdmin,
  deleteRewardAdmin,
} from "./admin.reward.controller";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

import { requireAdmin } from "../../middlewares/admin.middleware";

export const AdminRewardRoutes = Router();

AdminRewardRoutes.post("/", verifyFirebaseToken, requireAdmin, createReward);

AdminRewardRoutes.get(
  "",
  verifyFirebaseToken,
  requireAdmin,
  getAllRewardsAdmin,
);

AdminRewardRoutes.get(
  "/targets",
  verifyFirebaseToken,
  requireAdmin,
  getRewardTargetsAdmin,
);

AdminRewardRoutes.get(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  getRewardByIdAdmin,
);

AdminRewardRoutes.put(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateRewardAdmin,
);

AdminRewardRoutes.patch(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateRewardAdmin,
);

AdminRewardRoutes.delete(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteRewardAdmin,
);
