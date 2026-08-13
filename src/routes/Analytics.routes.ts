import { Router, Request, Response } from "express";
import { db } from "../config/firebase";

const router = Router();

/**
 * ============================
 * GET ANALYTICS ADMIN
 * ============================
 */
router.get("/admin", async (_: Request, res: Response) => {
  try {
    const doc = await db.collection("analyticsAdmin").doc("latest").get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ message: "Analytics Admin não encontrado" });
    }

    return res.status(200).json(doc.data());
  } catch (err) {
    console.error("Erro ao buscar Analytics Admin:", err);
    return res.status(500).json({ error: "Erro ao buscar Analytics Admin" });
  }
});

/**
 * ============================
 * GET ANALYTICS USER
 * ============================
 */
router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const doc = await db.collection("analyticsUser").doc(userId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Analytics User não encontrado" });
    }

    return res.status(200).json(doc.data());
  } catch (err) {
    console.error("Erro ao buscar Analytics User:", err);
    return res.status(500).json({ error: "Erro ao buscar Analytics User" });
  }
});

export default router;
