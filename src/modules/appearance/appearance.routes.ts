import { Router } from "express";
import {
  getAppearance,
  getThemeById,
  getThemes,
} from "./appearance.controller";

export const AppearanceRoutes = Router();

AppearanceRoutes.get("/", getAppearance);
AppearanceRoutes.get("/themes", getThemes);
AppearanceRoutes.get("/themes/:id", getThemeById);
