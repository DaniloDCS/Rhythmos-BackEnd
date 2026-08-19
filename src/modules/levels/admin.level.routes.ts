import { Router } from "express";

import {
  createLevel,
  getAllLevelsAdmin,
  getLevelByIdAdmin,
  updateLevelAdmin,
  activateLevelAdmin,
  deactivateLevelAdmin,
  deleteLevelAdmin,
} from "./admin.level.controller";

import { withAdmin } from "../../middlewares/with-admin";

export const AdminLevelRoutes = Router();

AdminLevelRoutes.post("/", ...withAdmin(createLevel));

AdminLevelRoutes.get("/", ...withAdmin(getAllLevelsAdmin));

AdminLevelRoutes.get("/:id", ...withAdmin(getLevelByIdAdmin));

AdminLevelRoutes.put("/:id", ...withAdmin(updateLevelAdmin));

AdminLevelRoutes.patch("/:id", ...withAdmin(updateLevelAdmin));

AdminLevelRoutes.patch("/:id/activate", ...withAdmin(activateLevelAdmin));

AdminLevelRoutes.patch("/:id/deactivate", ...withAdmin(deactivateLevelAdmin));

AdminLevelRoutes.delete("/:id", ...withAdmin(deleteLevelAdmin));
