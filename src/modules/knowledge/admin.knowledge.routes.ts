import { Router } from "express";

import {
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  getKnowledgeAdmin,
  getKnowledgeByIdAdmin,
  updateKnowledgeArticle,
  updateKnowledgeStatus,
} from "./admin.knowledge.controller";

import { withAdmin } from "../../middlewares/with-admin";

export const AdminKnowledgeRoutes = Router();

AdminKnowledgeRoutes.get("/", ...withAdmin(getKnowledgeAdmin));

AdminKnowledgeRoutes.get("/:id", ...withAdmin(getKnowledgeByIdAdmin));

AdminKnowledgeRoutes.post("", ...withAdmin(createKnowledgeArticle));

AdminKnowledgeRoutes.patch("/:id", ...withAdmin(updateKnowledgeArticle));

AdminKnowledgeRoutes.patch("/:id/status", ...withAdmin(updateKnowledgeStatus));

AdminKnowledgeRoutes.delete("/:id", ...withAdmin(deleteKnowledgeArticle));
