import { Router } from "express";
import { withAdmin } from "../../middlewares/with-admin";
import {
  createLaboratoryModule,
  deleteLaboratoryModule,
  getLaboratoryModulesAdmin,
  updateLaboratoryModule,
} from "./admin.laboratory.controller";

export const AdminLaboratoryRoutes = Router();
AdminLaboratoryRoutes.get("/", ...withAdmin(getLaboratoryModulesAdmin));
AdminLaboratoryRoutes.post("/", ...withAdmin(createLaboratoryModule));
AdminLaboratoryRoutes.put("/:id", ...withAdmin(updateLaboratoryModule));
AdminLaboratoryRoutes.patch("/:id", ...withAdmin(updateLaboratoryModule));
AdminLaboratoryRoutes.delete("/:id", ...withAdmin(deleteLaboratoryModule));
