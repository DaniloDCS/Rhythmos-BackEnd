import { Router } from "express";

import {
  getPublishedKnowledge,
  getPublishedKnowledgeBySlug,
} from "./knowledge.controller";

export const KnowledgeRoutes = Router();

KnowledgeRoutes.get("/", getPublishedKnowledge);

KnowledgeRoutes.get("/:slug", getPublishedKnowledgeBySlug);
