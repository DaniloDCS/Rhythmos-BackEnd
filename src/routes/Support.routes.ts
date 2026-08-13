import { Router } from "express";
import {
  createSupport,
  getAllSupports,
  getSupportsByUser,
  getSupportById,
  updateSupport,
  deleteSupport,
} from "../controllers/Support.controller";
import { verifyFirebaseToken } from "../middlewares/authMiddleware";
import { requireAdmin } from "../middlewares/adminMiddleware";

const router = Router();

// Usuário
router.post("/support", createSupport);
router.get("/support/user/:userId", getSupportsByUser);
router.get("/support/:id", getSupportById);
router.put("/support/:id/reply", updateSupport);

// Admin (ou protegido)
router.get(
  "/admin/supports",
  verifyFirebaseToken,
  requireAdmin,
  getAllSupports,
);
router.get(
  "/admin/support/:id",
  verifyFirebaseToken,
  requireAdmin,
  getSupportById,
);
router.put(
  "/admin/support/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateSupport,
);
router.delete(
  "/admin/support/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteSupport,
);

export default router;
