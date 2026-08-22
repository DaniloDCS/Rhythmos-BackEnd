import { Router } from "express";
import { withAdmin } from "../../middlewares/with-admin";
import {
  getRewardHistoryAdmin,
  getSettingsAdmin,
  rewardUserAdmin,
  updateSettingsAdmin,
} from "./admin.gamification.controller";

export const AdminGamificationRoutes = Router();
AdminGamificationRoutes.get("/settings", ...withAdmin(getSettingsAdmin));
AdminGamificationRoutes.put("/settings", ...withAdmin(updateSettingsAdmin));
AdminGamificationRoutes.patch("/settings", ...withAdmin(updateSettingsAdmin));
AdminGamificationRoutes.post("/users/:id/rewards", ...withAdmin(rewardUserAdmin));
AdminGamificationRoutes.get("/users/:id/rewards", ...withAdmin(getRewardHistoryAdmin));
