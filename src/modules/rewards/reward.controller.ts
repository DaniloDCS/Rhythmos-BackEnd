import { Request, Response } from "express";
import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { Reward, type RewardType } from "./reward.model";
import { parseBoolean, parseNumber } from "../../utils/parse";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

const COLLECTION = "rewards";

const TARGET_COLLECTIONS: Partial<Record<RewardType, string>> = {
  badge: "badges",
  unlock_game: "games",
  unlock_trail: "trails",
  unlock_module: "modules",
};

const validateRewardTarget = async (type: RewardType, value?: string) => {
  const collection = TARGET_COLLECTIONS[type];
  if (!collection) return;

  const targetId = value?.trim();

  if (!targetId) {
    throw new Error("Selecione o conteúdo que será desbloqueado.");
  }

  const targetDoc = await db.collection(collection).doc(targetId).get();

  if (!targetDoc.exists) {
    throw new Error("O conteúdo selecionado para esta recompensa não existe.");
  }
};

export const createReward = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const type = (req.body.type ?? "other") as RewardType;
    const value = req.body.value;

    await validateRewardTarget(type, value);

    const rewardRef = db.collection(COLLECTION).doc();

    const reward = new Reward({
      id: rewardRef.id,
      name: req.body.name,
      description: req.body.description,
      type,
      value,
      icon: req.body.icon,
      imageUrl: req.body.imageUrl,
      color: req.body.color,
      active: parseBoolean(req.body.active, true),
      featured: parseBoolean(req.body.featured, false),
      repeatable: parseBoolean(req.body.repeatable, false),
      order: parseNumber(req.body.order, 0),
      createdBy: req.user?.uid ?? req.body.createdBy,
      createdAt: Timestamp.now(),
    });

    reward.validate();
    await rewardRef.set(reward.toObject());

    return res.status(201).json(reward.toObject());
  } catch (err) {
    console.error("Erro ao criar recompensa:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao criar recompensa",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllRewardsAdmin = async (_: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("order", "asc")
      .get();

    const rewards = snapshot.docs.map((doc) =>
      Reward.fromFirestore(doc.id, doc.data()).toObject(),
    );

    return res.status(200).json(rewards);
  } catch (err) {
    console.error("Erro ao buscar recompensas:", err);
    return res.status(500).json({
      message: "Erro ao buscar recompensas",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getRewardByIdAdmin = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Recompensa não encontrada",
      });
    }

    return res
      .status(200)
      .json(Reward.fromFirestore(doc.id, doc.data()!).toObject());
  } catch (err) {
    console.error("Erro ao buscar recompensa:", err);
    return res.status(500).json({
      message: "Erro ao buscar recompensa",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getRewardTargetsAdmin = async (_: Request, res: Response) => {
  try {
    const [gamesSnapshot, trailsSnapshot, modulesSnapshot, badgesSnapshot] = await Promise.all([
      db.collection("games").get(),
      db.collection("trails").get(),
      db.collection("modules").get(),
      db.collection("badges").get(),
    ]);

    const mapTarget = (doc: QueryDocumentSnapshot) => {
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name ?? data.title ?? data.slug ?? doc.id,
      };
    };

    const sortTargets = (items: Array<{ id: string; name: string }>) =>
      items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return res.status(200).json({
      games: sortTargets(gamesSnapshot.docs.map(mapTarget)),
      trails: sortTargets(trailsSnapshot.docs.map(mapTarget)),
      modules: sortTargets(modulesSnapshot.docs.map(mapTarget)),
      badges: sortTargets(badgesSnapshot.docs.map(mapTarget)),
    });
  } catch (err) {
    console.error("Erro ao carregar destinos de recompensa:", err);
    return res.status(500).json({
      message: "Erro ao carregar destinos de recompensa",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateRewardAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const rewardRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await rewardRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Recompensa não encontrada",
      });
    }

    const reward = Reward.fromFirestore(doc.id, doc.data()!);
    const type = (req.body.type ?? reward.type) as RewardType;
    const value = req.body.value ?? reward.value;

    await validateRewardTarget(type, value);

    reward.update(
      {
        name: req.body.name ?? reward.name,
        description: req.body.description ?? reward.description,
        type,
        value,
        icon: req.body.icon ?? reward.icon,
        imageUrl: req.body.imageUrl ?? reward.imageUrl,
        color: req.body.color ?? reward.color,
        active: parseBoolean(req.body.active, reward.active),
        featured: parseBoolean(req.body.featured, reward.featured ?? false),
        repeatable: parseBoolean(
          req.body.repeatable,
          reward.repeatable ?? false,
        ),
        order: parseNumber(req.body.order, reward.order),
      },
      req.user?.uid ?? req.body.updatedBy,
    );

    await rewardRef.set(reward.toObject(), { merge: true });

    return res.status(200).json({
      message: "Recompensa atualizada com sucesso",
      reward: reward.toObject(),
    });
  } catch (err) {
    console.error("Erro ao atualizar recompensa:", err);
    return res.status(500).json({
      message:
        err instanceof Error ? err.message : "Erro ao atualizar recompensa",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteRewardAdmin = async (req: Request, res: Response) => {
  try {
    const rewardId = req.params.id;
    const rewardRef = db.collection(COLLECTION).doc(rewardId);
    const doc = await rewardRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Recompensa não encontrada",
      });
    }

    const [levels, lessons] = await Promise.all([
      db
        .collection("levels")
        .where("rewardIds", "array-contains", rewardId)
        .limit(1)
        .get(),
      db
        .collection("lessons")
        .where("completionRewardIds", "array-contains", rewardId)
        .limit(1)
        .get(),
    ]);

    if (!levels.empty || !lessons.empty) {
      return res.status(409).json({
        error: "CONFLICT",
        message:
          "Esta recompensa está vinculada a um nível ou aula. Remova os vínculos antes de excluí-la.",
      });
    }

    await rewardRef.delete();

    return res.status(200).json({ message: "Recompensa excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir recompensa:", err);
    return res.status(500).json({
      message: "Erro ao excluir recompensa",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getActiveRewards = async (_: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("active", "==", true)
      .orderBy("order", "asc")
      .get();

    const rewards = snapshot.docs.map((doc) =>
      Reward.fromFirestore(doc.id, doc.data()).toObject(),
    );

    return res.status(200).json(rewards);
  } catch (err) {
    console.error("Erro ao buscar recompensas ativas:", err);
    return res.status(500).json({
      message: "Erro ao buscar recompensas ativas",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
