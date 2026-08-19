import { Request, Response } from "express";

import { Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";

import { Level } from "./level.model";

const COLLECTION = "levels";

const normalizeBoolean = (value: unknown, defaultValue = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return defaultValue;
};

const normalizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
};

const validateRewardIds = async (rewardIds: string[]) => {
  if (!rewardIds.length) return;

  const snapshots = await Promise.all(
    rewardIds.map((id) => db.collection("rewards").doc(id).get()),
  );

  const missing = snapshots
    .filter((snapshot) => !snapshot.exists)
    .map((snapshot) => snapshot.id);

  if (missing.length) {
    throw new Error(`Recompensa(s) não encontrada(s): ${missing.join(", ")}`);
  }
};

export const createLevel = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      levelNumber,
      xpMin,
      xpMax,
      badgeName,
      badgeImageUrl,
      rewardIds,
      active,
      featured,
      color,
      icon,
      createdBy,
    } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", message: "name é obrigatório" });
    }

    await validateRewardIds(rewardIds);

    const levelRef = db.collection(COLLECTION).doc();

    const level = new Level({
      name,
      description,

      levelNumber: Number(levelNumber ?? 1),

      xpMin: Number(xpMin ?? 0),

      xpMax: Number(xpMax ?? 100),

      badgeName,
      badgeImageUrl,

      rewardIds: Array.isArray(rewardIds) ? rewardIds : [],

      active: normalizeBoolean(active, true),

      featured: normalizeBoolean(featured, false),

      color,
      icon,

      createdBy,

      createdAt: Timestamp.now(),
    });

    level.validate();

    const conflictSnap = await db
      .collection(COLLECTION)
      .where("levelNumber", "==", level.levelNumber)
      .get();

    if (!conflictSnap.empty) {
      return res.status(409).json({
        error: "CONFLICT",
        message: "Já existe um nível cadastrado com esse número.",
      });
    }

    await levelRef.set(level.toObject());

    return res.status(201).json(level.toObject());
  } catch (err) {
    console.error("Erro ao criar nível:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao criar nível",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllLevelsAdmin = async (_: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("levelNumber", "asc")
      .get();

    const levels = snapshot.docs.map((doc) =>
      Level.fromFirestore(doc.id, doc.data()).toObject(),
    );

    return res.status(200).json(levels);
  } catch (err) {
    console.error("Erro ao buscar níveis:", err);
    return res.status(500).json({
      message: "Erro ao buscar níveis",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getLevelByIdAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(COLLECTION).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Nível não encontrado",
      });
    }

    return res
      .status(200)
      .json(Level.fromFirestore(doc.id, doc.data()!).toObject());
  } catch (err) {
    console.error("Erro ao buscar nível:", err);
    return res.status(500).json({
      message: "Erro ao buscar nível",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateLevelAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const levelRef = db.collection(COLLECTION).doc(id);
    const doc = await levelRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Nível não encontrado",
      });
    }

    const level = Level.fromFirestore(doc.id, doc.data()!);
    const nextLevelNumber = Number(req.body.levelNumber ?? level.levelNumber);

    if (nextLevelNumber !== level.levelNumber) {
      const conflictSnap = await db
        .collection(COLLECTION)
        .where("levelNumber", "==", nextLevelNumber)
        .get();

      const hasConflict = conflictSnap.docs.some((item) => item.id !== id);

      if (hasConflict) {
        return res.status(409).json({
          error: "CONFLICT",
          message: "Já existe outro nível com esse número.",
        });
      }
    }

    const rewardIds =
      req.body.rewardIds !== undefined
        ? normalizeIds(req.body.rewardIds)
        : level.rewardIds;

    await validateRewardIds(rewardIds);

    level.update(
      {
        name: req.body.name ?? level.name,

        description: req.body.description ?? level.description,

        levelNumber: nextLevelNumber,

        xpMin: Number(req.body.xpMin ?? level.xpMin),

        xpMax: Number(req.body.xpMax ?? level.xpMax),

        badgeName: req.body.badgeName ?? level.badgeName,

        badgeImageUrl: req.body.badgeImageUrl ?? level.badgeImageUrl,

        rewardIds: Array.isArray(req.body.rewardIds)
          ? req.body.rewardIds
          : level.rewardIds,

        active:
          req.body.active !== undefined
            ? normalizeBoolean(req.body.active, level.active)
            : level.active,

        featured:
          req.body.featured !== undefined
            ? normalizeBoolean(req.body.featured, level.featured ?? false)
            : level.featured,

        color: req.body.color ?? level.color,

        icon: req.body.icon ?? level.icon,
      },

      updatedBy,
    );

    await levelRef.set(level.toObject(), { merge: true });

    return res.status(200).json({
      message: "Nível atualizado com sucesso",
      level: level.toObject(),
    });
  } catch (err) {
    console.error("Erro ao atualizar nível:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao atualizar nível",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const activateLevelAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;
    const levelRef = db.collection(COLLECTION).doc(id);
    const doc = await levelRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Nível não encontrado",
      });
    }

    const level = Level.fromFirestore(doc.id, doc.data()!);
    level.activate(updatedBy);
    await levelRef.set(level.toObject(), { merge: true });

    return res.status(200).json({
      message: "Nível ativado com sucesso",
      level: level.toObject(),
    });
  } catch (err) {
    console.error("Erro ao ativar nível:", err);
    return res.status(500).json({
      message: "Erro ao ativar nível",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deactivateLevelAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;
    const levelRef = db.collection(COLLECTION).doc(id);
    const doc = await levelRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Nível não encontrado",
      });
    }

    const level = Level.fromFirestore(doc.id, doc.data()!);
    level.deactivate(updatedBy);
    await levelRef.set(level.toObject(), { merge: true });

    return res.status(200).json({
      message: "Nível desativado com sucesso",
      level: level.toObject(),
    });
  } catch (err) {
    console.error("Erro ao desativar nível:", err);
    return res.status(500).json({
      message: "Erro ao desativar nível",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteLevelAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const levelRef = db.collection(COLLECTION).doc(id);
    const doc = await levelRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Nível não encontrado",
      });
    }

    await levelRef.delete();

    return res.status(200).json({ message: "Nível excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir nível:", err);
    return res.status(500).json({
      message: "Erro ao excluir nível",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
