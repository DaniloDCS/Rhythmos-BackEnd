import { Router } from "express";

import { getActiveLevels, getLevelByXp } from "./level.controller";

export const LevelRoutes = Router();

LevelRoutes.get("/", getActiveLevels);

LevelRoutes.get("/by-xp", getLevelByXp);
