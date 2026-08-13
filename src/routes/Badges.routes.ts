import { Router } from "express";
import {
  createBadge,
  getAllBadgesAdmin,
  getBadgeByIdAdmin,
  updateBadgeAdmin,
  deleteBadgeAdmin,
  getActiveBadges,
} from "../controllers/Badges.controller";

const router = Router();

router.post("/admin/badges", createBadge);
router.get("/admin/badges", getAllBadgesAdmin);
router.get("/admin/badges/:id", getBadgeByIdAdmin);
router.put("/admin/badges/:id", updateBadgeAdmin);
router.delete("/admin/badges/:id", deleteBadgeAdmin);

router.get("/badges", getActiveBadges);

export default router;
