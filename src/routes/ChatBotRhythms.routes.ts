import { Router } from "express";
import {
  createRhythm,
  getAllRhythms,
  getRhythmById,
  updateRhythm,
  deleteRhythm,
  createAllRhythm,
} from "../controllers/chatBotRhythms.controller";

const router = Router();

router.get("/rhythms", getAllRhythms);

router.get("/admin/rhythms-all", createAllRhythm);
router.get("/admin/rhythms", getAllRhythms);
router.get("/admin/rhythms/:id", getRhythmById);
router.post("/admin/rhythms", createRhythm);
router.put("/admin/rhythms/:id", updateRhythm);
router.delete("/admin/rhythms/:id", deleteRhythm);

export default router;
