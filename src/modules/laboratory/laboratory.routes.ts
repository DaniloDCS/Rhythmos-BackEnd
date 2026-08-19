import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import {
  getAvailableLaboratoryModules,
  getLaboratoryModuleAccess,
} from "./public.laboratory.controller";

export const LaboratoryRoutes = Router();
LaboratoryRoutes.get("/", getAvailableLaboratoryModules);
LaboratoryRoutes.get("/:slug", verifyFirebaseToken, getLaboratoryModuleAccess);
