import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import {
  createRhythmSketchChallenge,
  validateRhythmSketchChallenge,
} from "./rhythm-sketch.controller";

export const RhythmSketchRouter = Router();

RhythmSketchRouter.post(
  "/challenge",
  verifyFirebaseToken,
  createRhythmSketchChallenge,
);

RhythmSketchRouter.post(
  "/validate",
  verifyFirebaseToken,
  validateRhythmSketchChallenge,
);
