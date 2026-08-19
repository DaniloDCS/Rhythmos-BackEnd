import { Router } from "express";
import {
  getPublishedModules,
  getAccessibleModulesByTrail,
  getModuleById,
} from "./module.controller";

export const ModulesRoutes = Router();

ModulesRoutes.get("/modules/published", getPublishedModules);
ModulesRoutes.get(
  "/trails/:trailId/modules/accessible",
  getAccessibleModulesByTrail,
);
ModulesRoutes.get("/modules/:id", getModuleById);
