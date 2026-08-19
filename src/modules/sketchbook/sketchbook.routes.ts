import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/auth.middleware";
import {
  createSketchbookTab,
  deleteSketchbookTab,
  getSketchbookTabs,
  updateSketchbookTab,
} from "./sketchbook.controller";

export const SketchbookRouter = Router();

SketchbookRouter.get("/", verifyFirebaseToken, getSketchbookTabs);

SketchbookRouter.post("/tabs", verifyFirebaseToken, createSketchbookTab);

SketchbookRouter.patch("/tabs/:id", verifyFirebaseToken, updateSketchbookTab);

SketchbookRouter.delete("/tabs/:id", verifyFirebaseToken, deleteSketchbookTab);
