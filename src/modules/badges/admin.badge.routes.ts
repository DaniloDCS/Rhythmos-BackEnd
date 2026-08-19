import { Router } from "express";

import {
  createBadge,
  getAllBadgesAdmin,
  getBadgeByIdAdmin,
  updateBadgeAdmin,
  deleteBadgeAdmin,
} from "./admin.badge.controller";

import { withAdmin } from "../../middlewares/with-admin";

export const AdminBadgeRoutes = Router();

AdminBadgeRoutes.post("/", ...withAdmin(createBadge));

AdminBadgeRoutes.get("/", ...withAdmin(getAllBadgesAdmin));

AdminBadgeRoutes.get("/:id", ...withAdmin(getBadgeByIdAdmin));

AdminBadgeRoutes.put("/:id", ...withAdmin(updateBadgeAdmin));

AdminBadgeRoutes.delete("/:id", ...withAdmin(deleteBadgeAdmin));
