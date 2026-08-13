import { Router } from "express";
import {
  createQuestion,
  getAllQuestions,
  updateQuestion,
  deleteQuestion,
  getVisibleQuestions,
} from "../controllers/crosswords.controller";

const router = Router();

router.get("/crosswords", getVisibleQuestions);

router.get("/admin/crosswords", getAllQuestions);
router.post("/admin/crosswords", createQuestion);
router.put("/admin/crosswords/:id", updateQuestion);
router.delete("/admin/crosswords/:id", deleteQuestion);

export default router;
