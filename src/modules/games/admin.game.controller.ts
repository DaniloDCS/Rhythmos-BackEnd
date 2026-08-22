import { Request, Response } from "express";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";

import { Game } from "./game.model";

import { parseArrayField, parseBoolean, parseNumber } from "../../utils/parse";

import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

import { IUserProgress } from "../users/user-progress.types";

import { ILevel } from "../levels/level.model";

import { calculateUpdatedStreak } from "../users/user-progress.controller";

import {
  GrantedReward,
  grantRewardsInTransaction,
} from "../rewards/reward.service";

import { recordHeatmapActivity } from "../../utils/record-heatmap-activity";

const COLLECTION = "games";

const normalizeSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const ensureUniqueSlug = async (slug: string, ignoreId?: string) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .limit(2)
    .get();

  return !snapshot.docs.some((doc) => doc.id !== ignoreId);
};

export const createGame = async (req: Request, res: Response) => {
  try {
    const gameRef = db.collection(COLLECTION).doc();

    const requestedSlug = String(req.body.slug || req.body.name || "");
    const slug = normalizeSlug(requestedSlug);

    if (!slug) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", message: "slug é obrigatório." });
    }

    if (!(await ensureUniqueSlug(slug))) {
      return res.status(409).json({
        error: "CONFLICT",
        message: "Já existe um jogo cadastrado com este slug.",
      });
    }

    const game = new Game({
      id: gameRef.id,
      name: req.body.name,
      slug,
      description: req.body.description,
      shortDescription: req.body.shortDescription,
      thumbnailUrl: req.body.thumbnailUrl,
      category: req.body.category,
      difficulty: req.body.difficulty,
      status: req.body.status ?? "em_construcao",
      featured: parseBoolean(req.body.featured, false),
      players: 0,
      xpReward: parseNumber(req.body.xpReward, 0),
      tags: parseArrayField(req.body.tags),
      content: req.body.content,
      createdAt: Timestamp.now(),
    });

    game.validate();
    await gameRef.set(game.toObject());

    return res.status(201).json(game.toObject());
  } catch (err) {
    console.error("Erro ao criar jogo:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao criar jogo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllGamesAdmin = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const cursor = req.query.cursor as string | undefined;

    let query = db.collection(COLLECTION).orderBy("name").limit(limit);

    if (cursor) {
      const lastDoc = await db.collection(COLLECTION).doc(cursor).get();

      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    const games = snapshot.docs.map((doc) =>
      Game.fromFirestore(doc.id, doc.data()).toObject(),
    );

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    const totalSnapshot = await db.collection(COLLECTION).count().get();

    return res.status(200).json({
      data: games,

      nextCursor: lastVisible?.id ?? null,

      count: totalSnapshot.data().count,
    });
  } catch (err) {
    console.error("Erro ao buscar jogos:", err);

    return res.status(500).json({
      message: "Erro ao buscar jogos",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getGameByIdAdmin = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Jogo não encontrado" });
    }

    return res
      .status(200)
      .json(Game.fromFirestore(doc.id, doc.data()!).toObject());
  } catch (err) {
    console.error("Erro ao buscar jogo:", err);
    return res.status(500).json({
      message: "Erro ao buscar jogo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateGameAdmin = async (req: Request, res: Response) => {
  try {
    const gameRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Jogo não encontrado" });
    }

    const game = Game.fromFirestore(doc.id, doc.data()!);

    const nextSlug = normalizeSlug(
      String(req.body.slug ?? game.slug ?? req.body.name ?? game.name),
    );

    if (!nextSlug) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", message: "slug é obrigatório." });
    }

    if (!(await ensureUniqueSlug(nextSlug, game.id))) {
      return res.status(409).json({
        error: "CONFLICT",
        message: "Já existe outro jogo cadastrado com este slug.",
      });
    }

    game.update({
      name: req.body.name ?? game.name,
      slug: nextSlug,
      description: req.body.description ?? game.description,
      shortDescription: req.body.shortDescription ?? game.shortDescription,
      thumbnailUrl: req.body.thumbnailUrl ?? game.thumbnailUrl,
      category: req.body.category ?? game.category,
      difficulty: req.body.difficulty ?? game.difficulty,
      status: req.body.status ?? game.status,
      featured: parseBoolean(req.body.featured, game.featured ?? false),
      xpReward: parseNumber(req.body.xpReward, game.xpReward),
      tags:
        req.body.tags !== undefined
          ? parseArrayField(req.body.tags)
          : game.tags,
      content: req.body.content ?? game.content,
    });

    await gameRef.set(game.toObject(), { merge: true });

    return res.status(200).json({
      message: "Jogo atualizado com sucesso",
      game: game.toObject(),
    });
  } catch (err) {
    console.error("Erro ao atualizar jogo:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao atualizar jogo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteGameAdmin = async (req: Request, res: Response) => {
  try {
    const gameRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Jogo não encontrado" });
    }

    const linkedRewardSnapshot = await db
      .collection("rewards")
      .where("type", "==", "unlock_game")
      .where("value", "==", req.params.id)
      .limit(1)
      .get();

    if (!linkedRewardSnapshot.empty) {
      return res.status(409).json({
        error: "CONFLICT",
        message:
          "Este jogo é alvo de uma recompensa. Remova ou altere a recompensa antes de excluir o jogo.",
      });
    }

    await gameRef.delete();

    return res.status(200).json({ message: "Jogo excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir jogo:", err);
    return res.status(500).json({
      message: "Erro ao excluir jogo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
