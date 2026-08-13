import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import {
  createRhythmSketchChallenge,
  validateRhythmSketchChallenge,
} from "./rhythmSketch.controller";

const RhythmSketchRouter = Router();

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

export default RhythmSketchRouter;
