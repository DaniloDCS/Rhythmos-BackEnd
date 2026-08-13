import { Router } from "express";

import {
  createReward,
  getAllRewardsAdmin,
  getRewardByIdAdmin,
  getRewardTargetsAdmin,
  updateRewardAdmin,
  deleteRewardAdmin,
  getActiveRewards,
} from "../controllers/Rewards.controller";

import { verifyFirebaseToken } from "../middlewares/authMiddleware";

import { requireAdmin } from "../middlewares/adminMiddleware";

const router = Router();

router.post("/admin/rewards", verifyFirebaseToken, requireAdmin, createReward);

router.get(
  "/admin/rewards",
  verifyFirebaseToken,
  requireAdmin,
  getAllRewardsAdmin,
);

router.get(
  "/admin/rewards/targets",
  verifyFirebaseToken,
  requireAdmin,
  getRewardTargetsAdmin,
);

router.get(
  "/admin/rewards/:id",
  verifyFirebaseToken,
  requireAdmin,
  getRewardByIdAdmin,
);

router.put(
  "/admin/rewards/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateRewardAdmin,
);

router.patch(
  "/admin/rewards/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateRewardAdmin,
);

router.delete(
  "/admin/rewards/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteRewardAdmin,
);

router.get("/rewards", getActiveRewards);

export default router;
