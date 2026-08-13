import { Router } from "express";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import {
  createSketchbookTab,
  deleteSketchbookTab,
  getSketchbookTabs,
  updateSketchbookTab,
} from "./sketchbook.controller";

const SketchbookRouter = Router();

SketchbookRouter.get(
  "/",
  verifyFirebaseToken,
  getSketchbookTabs,
);

SketchbookRouter.post(
  "/tabs",
  verifyFirebaseToken,
  createSketchbookTab,
);

SketchbookRouter.patch(
  "/tabs/:id",
  verifyFirebaseToken,
  updateSketchbookTab,
);

SketchbookRouter.delete(
  "/tabs/:id",
  verifyFirebaseToken,
  deleteSketchbookTab,
);

export default SketchbookRouter;
