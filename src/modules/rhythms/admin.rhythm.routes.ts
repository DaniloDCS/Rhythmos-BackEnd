import { Router } from "express";

import {
  createRhythm,
  getAllRhythms,
  getRhythmById,
  updateRhythm,
  deleteRhythm,
  createAllRhythm,
} from "./admin.rhythm.controller";

import { withAdmin } from "../../middlewares/with-admin";

export const AdminRhythmRoutes = Router();

AdminRhythmRoutes.get("/rhythms-all", ...withAdmin(createAllRhythm));

AdminRhythmRoutes.get("/rhythms", ...withAdmin(getAllRhythms));

AdminRhythmRoutes.get("/rhythms/:id", ...withAdmin(getRhythmById));

AdminRhythmRoutes.post("/rhythms", ...withAdmin(createRhythm));

AdminRhythmRoutes.put("/rhythms/:id", ...withAdmin(updateRhythm));

AdminRhythmRoutes.delete("/rhythms/:id", ...withAdmin(deleteRhythm));
