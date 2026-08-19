import { Router } from "express";

import { getVisibleQuestions } from "./crossword.controller";

export const CrosswordRoutes = Router();

CrosswordRoutes.get("/", getVisibleQuestions);
