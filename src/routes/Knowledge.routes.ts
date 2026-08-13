import { Router } from "express";

import {
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  getKnowledgeAdmin,
  getKnowledgeByIdAdmin,
  getPublishedKnowledge,
  getPublishedKnowledgeBySlug,
  updateKnowledgeArticle,
  updateKnowledgeStatus,
} from "../controllers/Knowledge.controller";
import { verifyFirebaseToken } from "../middlewares/authMiddleware";

const KnowledgeRoutes = Router();

/* =========================
   PÚBLICO / USUÁRIO
========================= */
KnowledgeRoutes.get("/knowledge", getPublishedKnowledge);
KnowledgeRoutes.get("/knowledge/:slug", getPublishedKnowledgeBySlug);

/* =========================
   ADMIN
========================= */
KnowledgeRoutes.get("/admin/knowledge", verifyFirebaseToken, getKnowledgeAdmin);
KnowledgeRoutes.get(
  "/admin/knowledge/:id",
  verifyFirebaseToken,
  getKnowledgeByIdAdmin,
);
KnowledgeRoutes.post(
  "/admin/knowledge",
  verifyFirebaseToken,
  createKnowledgeArticle,
);
KnowledgeRoutes.patch(
  "/admin/knowledge/:id",
  verifyFirebaseToken,
  updateKnowledgeArticle,
);
KnowledgeRoutes.patch(
  "/admin/knowledge/:id/status",
  verifyFirebaseToken,
  updateKnowledgeStatus,
);
KnowledgeRoutes.delete(
  "/admin/knowledge/:id",
  verifyFirebaseToken,
  deleteKnowledgeArticle,
);

export default KnowledgeRoutes;
