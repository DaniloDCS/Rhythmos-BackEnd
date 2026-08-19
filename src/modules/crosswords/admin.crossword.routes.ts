import { Router } from "express";

import {
  createQuestion,
  getAllQuestions,
  updateQuestion,
  deleteQuestion,
} from "./admin.crossword.controller";

import { withAdmin } from "../../middlewares/with-admin";

export const AdminCrosswordRoutes = Router();

AdminCrosswordRoutes.get("/", ...withAdmin(getAllQuestions));

AdminCrosswordRoutes.post("/", ...withAdmin(createQuestion));

AdminCrosswordRoutes.put("/:id", ...withAdmin(updateQuestion));

AdminCrosswordRoutes.delete("/:id", ...withAdmin(deleteQuestion));
