import { Router } from "express";

import { getActiveRewards } from "./reward.controller";

export const RewardRoutes = Router();

RewardRoutes.get("/", getActiveRewards);
