import { Request, Response } from "express";

import { Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";

import { Badge } from "./badge.model";

import { parseBoolean, parseNumber } from "../../utils/parse";

const COLLECTION = "badges";

export const createBadge = async (req: Request, res: Response) => {
  try {
    const badgeRef = db.collection(COLLECTION).doc();

    const badge = new Badge({
      id: badgeRef.id,
      name: req.body.name,
      description: req.body.description,
      fullImageUrl: req.body.fullImageUrl,
      silhouetteImageUrl: req.body.silhouetteImageUrl,
      icon: req.body.icon,
      color: req.body.color,
      rarity: req.body.rarity,
      order: parseNumber(req.body.order, 0),
      active: parseBoolean(req.body.active, true),
      featured: parseBoolean(req.body.featured, false),
      condition: {
        type: req.body.conditionType ?? "manual",
        value: parseNumber(req.body.conditionValue, 0),
      },
      createdBy: req.body.createdBy,
      createdAt: Timestamp.now(),
    });

    badge.validate();
    await badgeRef.set(badge.toObject());

    return res.status(201).json(badge.toObject());
  } catch (err) {
    console.error("Erro ao criar insígnia:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao criar insígnia",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllBadgesAdmin = async (_: Request, res: Response) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const badges = snapshot.docs.map((doc) =>
      Badge.fromFirestore(doc.id, doc.data()).toObject(),
    );
    return res.status(200).json(badges);
  } catch (err) {
    console.error("Erro ao buscar insígnias:", err);
    return res.status(500).json({
      message: "Erro ao buscar insígnias",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getBadgeByIdAdmin = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Insígnia não encontrada",
      });
    }

    return res
      .status(200)
      .json(Badge.fromFirestore(doc.id, doc.data()!).toObject());
  } catch (err) {
    console.error("Erro ao buscar insígnia:", err);
    return res.status(500).json({
      message: "Erro ao buscar insígnia",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateBadgeAdmin = async (req: Request, res: Response) => {
  try {
    const badgeRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await badgeRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Insígnia não encontrada",
      });
    }

    const badge = Badge.fromFirestore(doc.id, doc.data()!);

    badge.update(
      {
        name: req.body.name ?? badge.name,
        description: req.body.description ?? badge.description,
        fullImageUrl: req.body.fullImageUrl ?? badge.fullImageUrl,
        silhouetteImageUrl:
          req.body.silhouetteImageUrl ?? badge.silhouetteImageUrl,
        icon: req.body.icon ?? badge.icon,
        color: req.body.color ?? badge.color,
        rarity: req.body.rarity ?? badge.rarity,
        order: parseNumber(req.body.order, badge.order),
        active: parseBoolean(req.body.active, badge.active),
        featured: parseBoolean(req.body.featured, badge.featured ?? false),
        condition: {
          type: req.body.conditionType ?? badge.condition?.type ?? "manual",
          value: parseNumber(
            req.body.conditionValue,
            badge.condition?.value ?? 0,
          ),
        },
      },
      req.body.updatedBy,
    );

    await badgeRef.set(badge.toObject(), { merge: true });

    return res.status(200).json({
      message: "Insígnia atualizada com sucesso",
      badge: badge.toObject(),
    });
  } catch (err) {
    console.error("Erro ao atualizar insígnia:", err);
    return res.status(500).json({
      message:
        err instanceof Error ? err.message : "Erro ao atualizar insígnia",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteBadgeAdmin = async (req: Request, res: Response) => {
  try {
    const badgeRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await badgeRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Insígnia não encontrada",
      });
    }

    const rewardSnapshot = await db
      .collection("rewards")
      .where("value", "==", req.params.id)
      .get();
    const linkedReward = rewardSnapshot.docs.find(
      (item) => item.data().type === "badge",
    );
    if (linkedReward) {
      return res.status(409).json({
        error: "CONFLICT",
        message:
          "Esta insígnia está vinculada a uma recompensa. Remova o vínculo antes de excluí-la.",
      });
    }

    await badgeRef.delete();

    return res.status(200).json({ message: "Insígnia excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir insígnia:", err);
    return res.status(500).json({
      message: "Erro ao excluir insígnia",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
