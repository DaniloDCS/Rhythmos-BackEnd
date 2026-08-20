import { Router } from "express";
import {
  activateTheme,
  createTheme,
  deleteTheme,
  getThemes,
  updateAppearance,
  updateTheme,
} from "./appearance.controller";

export const AdminAppearanceRoutes = Router();

AdminAppearanceRoutes.put("/", updateAppearance);

AdminAppearanceRoutes.get("/themes", getThemes);
AdminAppearanceRoutes.post("/themes", createTheme);
AdminAppearanceRoutes.put("/themes/:id", updateTheme);
AdminAppearanceRoutes.put("/themes/:id/activate", activateTheme);
AdminAppearanceRoutes.delete("/themes/:id", deleteTheme);
