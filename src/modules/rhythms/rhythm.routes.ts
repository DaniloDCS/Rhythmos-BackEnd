import { Router } from "express";

import { getAllRhythms } from "./rhythm.controller";

export const RhythmRoutes = Router();

RhythmRoutes.get("/", getAllRhythms);
