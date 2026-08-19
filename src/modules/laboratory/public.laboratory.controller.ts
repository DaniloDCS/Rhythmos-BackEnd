import type { Response } from "express";
import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { LaboratoryModule } from "./laboratory.model";

const COLLECTION = "laboratory_modules";

export const getAvailableLaboratoryModules = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const modules = snapshot.docs
      .map((doc) => new LaboratoryModule({ id: doc.id, ...doc.data() }))
      .filter((module) => module.status === "disponivel")
      .sort((a, b) => a.sequence - b.sequence)
      .map((module) => module.toObject());
    return res.status(200).json(modules);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Não foi possível buscar os módulos do laboratório.",
    });
  }
};

export const getLaboratoryModuleAccess = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const requestedSlug = String(req.params.slug ?? "").trim();
    const aliases = [
      requestedSlug,
      requestedSlug.startsWith("laboratory-")
        ? requestedSlug.replace(/^laboratory-/, "")
        : `laboratory-${requestedSlug}`,
    ];
    const snapshot = await db
      .collection(COLLECTION)
      .where("slug", "in", aliases)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Módulo do laboratório não encontrado.",
      });
    }

    const doc = snapshot.docs[0];
    const module = new LaboratoryModule({ id: doc.id, ...doc.data() });
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const isAdmin = userDoc.data()?.role === "administrador";

    if (!isAdmin && module.status !== "disponivel") {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Este módulo do laboratório não está disponível.",
      });
    }

    return res.status(200).json(module.toObject());
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Não foi possível verificar o acesso ao laboratório.",
    });
  }
};
