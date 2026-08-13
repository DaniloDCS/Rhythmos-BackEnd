import { Request, Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { Game } from "../models/Games";
import { parseArrayField, parseBoolean, parseNumber } from "../utils/parse";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { IUserProgress } from "../interfaces/IUserProgress";
import { ILevel } from "../models/Levels";
import { calculateUpdatedStreak } from "./UserProgress.controller";
import {
  GrantedReward,
  grantRewardsInTransaction,
} from "../services/RewardService";
import { recordHeatmapActivity } from "../utils/recordHeatmapActivity";
import { IUser } from "../models/User";

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
      return res.status(400).json({ message: "slug é obrigatório." });
    }

    if (!(await ensureUniqueSlug(slug))) {
      return res.status(409).json({
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
      createdAt: Timestamp.now(),
    });

    game.validate();
    await gameRef.set(game.toObject());

    return res.status(201).json(game.toObject());
  } catch (err) {
    console.error("Erro ao criar jogo:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao criar jogo",
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
      error: "Erro ao buscar jogos",
    });
  }
};

export const getGameByIdAdmin = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Jogo não encontrado" });
    }

    return res
      .status(200)
      .json(Game.fromFirestore(doc.id, doc.data()!).toObject());
  } catch (err) {
    console.error("Erro ao buscar jogo:", err);
    return res.status(500).json({ error: "Erro ao buscar jogo" });
  }
};

export const updateGameAdmin = async (req: Request, res: Response) => {
  try {
    const gameRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Jogo não encontrado" });
    }

    const game = Game.fromFirestore(doc.id, doc.data()!);

    const nextSlug = normalizeSlug(
      String(req.body.slug ?? game.slug ?? req.body.name ?? game.name),
    );

    if (!nextSlug) {
      return res.status(400).json({ message: "slug é obrigatório." });
    }

    if (!(await ensureUniqueSlug(nextSlug, game.id))) {
      return res.status(409).json({
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
    });

    await gameRef.set(game.toObject(), { merge: true });

    return res.status(200).json({
      message: "Jogo atualizado com sucesso",
      game: game.toObject(),
    });
  } catch (err) {
    console.error("Erro ao atualizar jogo:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao atualizar jogo",
    });
  }
};

export const deleteGameAdmin = async (req: Request, res: Response) => {
  try {
    const gameRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Jogo não encontrado" });
    }

    const linkedRewardSnapshot = await db
      .collection("rewards")
      .where("type", "==", "unlock_game")
      .where("value", "==", req.params.id)
      .limit(1)
      .get();

    if (!linkedRewardSnapshot.empty) {
      return res.status(409).json({
        message:
          "Este jogo é alvo de uma recompensa. Remova ou altere a recompensa antes de excluir o jogo.",
      });
    }

    await gameRef.delete();

    return res.status(200).json({ message: "Jogo excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir jogo:", err);
    return res.status(500).json({ error: "Erro ao excluir jogo" });
  }
};

export const incrementGamePlayers = async (req: Request, res: Response) => {
  try {
    const gameRef = db.collection(COLLECTION).doc(req.params.id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Jogo não encontrado",
      });
    }

    await gameRef.update({
      players: FieldValue.increment(1),
    });

    return res.status(200).json({
      message: "Quantidade de acessos atualizada com sucesso",
    });
  } catch (err) {
    console.error("Erro ao atualizar acessos:", err);

    return res.status(500).json({
      error: "Erro ao atualizar acessos",
    });
  }
};

export const getAvailableGames = async (_: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "disponivel")
      .get();

    const games = snapshot.docs.map((doc) =>
      Game.fromFirestore(doc.id, doc.data()).toObject(),
    );

    return res.status(200).json(games);
  } catch (err) {
    console.error("Erro ao buscar jogos disponíveis:", err);

    return res.status(500).json({
      error: "Erro ao buscar jogos disponíveis",
    });
  }
};

export const getAvailableGameById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    /*
     * ========================================
     * VERIFICA SE É ADMIN
     * ========================================
     */

    const userDoc = await db.collection("users").doc(userId).get();

    const isAdmin = userDoc.exists && userDoc.data()?.role === "administrador";

    /*
     * ========================================
     * BUSCA JOGO
     * ========================================
     */

    const gameRef = db.collection(COLLECTION).doc(req.params.id);

    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        message: "Jogo não encontrado",
      });
    }

    const game = Game.fromFirestore(doc.id, doc.data()!);

    /*
     * ========================================
     * DISPONIBILIDADE
     * ========================================
     *
     * Usuário comum:
     * só acessa jogo disponível.
     *
     * Administrador:
     * pode acessar qualquer status para testar.
     */

    if (!isAdmin && game.status !== "disponivel") {
      return res.status(404).json({
        message: "Jogo não encontrado",
      });
    }

    /*
     * ========================================
     * RESPONSE
     * ========================================
     */

    return res.status(200).json(game.toObject());
  } catch (err) {
    console.error("Erro ao buscar jogo:", err);

    return res.status(500).json({
      error: "Erro ao buscar jogo",
    });
  }
};

export const completeGame = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    /*
     * ========================================
     * AUTENTICAÇÃO
     * ========================================
     */

    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;
    const { id } = req.params;

    const userDoc = await db.collection("users").doc(userId).get();

    const userData = userDoc.data();

    const role = String(userData?.role ?? "").toLowerCase();

    const isAdmin = role === "admin" || role === "administrador";

    const {
      score = 0,
      timeSeconds = 0,
      correctAnswers = 0,
      totalAnswers = 0,
      perfectRun = false,
      won = true,
    } = req.body;

    /*
     * ========================================
     * BUSCA JOGO
     * ========================================
     */

    const gameRef = db.collection(COLLECTION).doc(id);

    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      return res.status(404).json({
        message: "Jogo não encontrado.",
      });
    }

    const game = Game.fromFirestore(gameDoc.id, gameDoc.data()!);

    if (game.status !== "disponivel") {
      return res.status(403).json({
        message: "Este jogo não está disponível.",
      });
    }

    /*
     * ========================================
     * XP
     * ========================================
     *
     * O frontend NÃO informa XP.
     *
     * A recompensa vem exclusivamente
     * da configuração do jogo.
     */

    const isWinner = Boolean(won);

    /*
     * A nova interface possui um único valor de XP por jogo.
     * `completeGame` representa a conclusão da partida, portanto
     * `xpReward` é concedido uma vez por conclusão registrada.
     */
    const xpReward = Math.max(0, Number(game.xpReward ?? 0));

    /*
     * ========================================
     * NÍVEIS
     * ========================================
     */

    const levelsSnapshot = await db.collection("levels").get();

    if (levelsSnapshot.empty) {
      return res.status(500).json({
        message: "Nenhum nível cadastrado.",
      });
    }

    const availableLevels: ILevel[] = levelsSnapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          ...data,
          active: data.active === true || data.active === "true",
          featured: data.featured === true || data.featured === "true",
        } as ILevel;
      })
      .filter((level) => level.active)
      .sort((a, b) => a.levelNumber - b.levelNumber);

    if (!availableLevels.length) {
      return res.status(500).json({
        message: "Nenhum nível ativo cadastrado.",
      });
    }

    /*
     * ========================================
     * REFERÊNCIAS
     * ========================================
     */

    const progressRef = db.collection("user_progress").doc(userId);

    const historyRef = db.collection("game_history").doc();

    const now = Timestamp.now();

    /*
     * Resultado que será enviado
     * após a transaction.
     */

    let responseData:
      | {
          xp: {
            added: number;
            previous: number;
            current: number;
          };
          levelUp: boolean;
          level: {
            previous: number;
            current: number;
            title: string;
            progressPercent: number;
          };
          streak: any;
          rewards: GrantedReward[];
          progress: IUserProgress;
        }
      | undefined;

    /*
     * ========================================
     * TRANSACTION
     * ========================================
     */

    await db.runTransaction(async (transaction) => {
      /*
       * Importante:
       * lê o progresso dentro da transaction
       * para evitar duas partidas simultâneas
       * sobrescrevendo XP.
       */

      const progressDoc = await transaction.get(progressRef);

      if (!progressDoc.exists) {
        throw new Error("Progresso global do usuário não encontrado.");
      }

      const userProgress = progressDoc.data() as IUserProgress;

      /*
       * Sincroniza primeiro as recompensas dos níveis que o usuário
       * já havia alcançado. Isso evita bloquear usuários antigos que
       * ainda não possuem o mapa `unlocked` e também contempla
       * recompensas adicionadas retroativamente a um nível.
       */
      const reachedLevelRewardRequests = availableLevels
        .filter(
          (level) =>
            level.levelNumber <= Number(userProgress.level?.current ?? 1),
        )
        .flatMap((level) =>
          (level.rewardIds ?? []).map((rewardId) => ({
            rewardId,
            source: {
              type: "level" as const,
              id: level.id ?? String(level.levelNumber),
            },
          })),
        );

      const accessRewardResult = await grantRewardsInTransaction(
        transaction,
        userProgress,
        reachedLevelRewardRequests,
      );

      const progressAtStart = accessRewardResult.progress;

      if (!isAdmin && !progressAtStart.unlocked?.games?.[id]) {
        throw new Error("GAME_LOCKED");
      }

      /*
       * ------------------------------------
       * XP
       * ------------------------------------
       */

      const oldTotalXp = progressAtStart.xp?.total ?? 0;

      const oldLevelNumber = progressAtStart.level?.current ?? 1;

      const newTotalXp = oldTotalXp + xpReward;

      /*
       * Encontra o nível mais alto cujo
       * xpMin seja menor ou igual ao XP.
       */

      const currentLevel =
        [...availableLevels]
          .reverse()
          .find((level) => newTotalXp >= level.xpMin) ?? availableLevels[0];

      const currentLevelIndex = availableLevels.findIndex(
        (level) => level.levelNumber === currentLevel.levelNumber,
      );

      const nextLevel = availableLevels[currentLevelIndex + 1];

      const currentLevelXp = Math.max(0, newTotalXp - currentLevel.xpMin);

      const levelXpRange = nextLevel
        ? nextLevel.xpMin - currentLevel.xpMin
        : Math.max(0, currentLevel.xpMax - currentLevel.xpMin);

      let progressPercent = 100;

      if (nextLevel && levelXpRange > 0) {
        progressPercent = Math.min(
          100,
          Number(((currentLevelXp / levelXpRange) * 100).toFixed(2)),
        );
      }

      /*
       * ------------------------------------
       * HISTÓRICO DE NÍVEIS
       * ------------------------------------
       */

      const updatedLevels = [...(progressAtStart.levels ?? [])];

      const newlyUnlockedLevels = availableLevels.filter(
        (level) =>
          level.levelNumber > oldLevelNumber &&
          level.levelNumber <= currentLevel.levelNumber,
      );

      const reachedAt = new Date().toISOString();

      for (const level of newlyUnlockedLevels) {
        const alreadyExists = updatedLevels.some(
          (item) => item.level === level.levelNumber,
        );

        if (!alreadyExists) {
          updatedLevels.push({
            level: level.levelNumber,
            title: level.name,
            unlocked: true,
            reachedAt,
          });
        }
      }

      updatedLevels.sort((a, b) => a.level - b.level);

      const rewardRequests = newlyUnlockedLevels.flatMap((level) =>
        (level.rewardIds ?? []).map((rewardId) => ({
          rewardId,
          source: {
            type: "level" as const,
            id: level.id ?? String(level.levelNumber),
          },
        })),
      );

      const rewardResult = await grantRewardsInTransaction(
        transaction,
        progressAtStart,
        rewardRequests,
      );

      /*
       * ------------------------------------
       * STREAK
       * ------------------------------------
       */

      const streakResult = calculateUpdatedStreak(progressAtStart);

      /*
       * ------------------------------------
       * MÉTRICAS DOS JOGOS
       * ------------------------------------
       */

      const previousGames = progressAtStart.games ?? {
        played: 0,
        completed: 0,
        wins: 0,
        perfectRuns: 0,
        totalPlayTimeSeconds: 0,
        lastPlayedAt: null,
      };

      const updatedGames = {
        ...previousGames,
        played: (previousGames.played ?? 0) + 1,
        completed: (previousGames.completed ?? 0) + 1,
        wins: (previousGames.wins ?? 0) + (isWinner ? 1 : 0),
        perfectRuns:
          (previousGames.perfectRuns ?? 0) + (isWinner && perfectRun ? 1 : 0),
        totalPlayTimeSeconds:
          (previousGames.totalPlayTimeSeconds ?? 0) +
          (Number(timeSeconds) || 0),
        lastPlayedAt: new Date().toISOString(),
      };

      /*
       * ------------------------------------
       * NOVO PROGRESSO
       * ------------------------------------
       */

      const updatedProgress: IUserProgress = {
        ...rewardResult.progress,
        xp: {
          ...progressAtStart.xp,
          total: newTotalXp,
          currentLevelXp: nextLevel
            ? currentLevelXp
            : Math.min(currentLevelXp, levelXpRange),
          nextLevelXp: Math.max(levelXpRange, 0),
        },
        level: {
          ...progressAtStart.level,
          current: currentLevel.levelNumber,
          currentTitle: currentLevel.name,
          progressPercent,
        },
        levels: updatedLevels,
        rewards: rewardResult.progress.rewards,
        unlocked: rewardResult.progress.unlocked,
        games: updatedGames,
        streak: streakResult.streak,
        updatedAt: now,
      };

      /*
       * ------------------------------------
       * SALVA PARTIDA
       * ------------------------------------
       */

      transaction.set(historyRef, {
        id: historyRef.id,
        userId,
        gameId: id,
        gameName: game.name,
        score: Number(score) || 0,
        timeSeconds: Number(timeSeconds) || 0,
        correctAnswers: Number(correctAnswers) || 0,
        totalAnswers: Number(totalAnswers) || 0,
        won: isWinner,
        perfectRun: Boolean(perfectRun),
        xpAwarded: xpReward,
        xpBreakdown: {
          game: xpReward,
        },
        completed: true,
        completedAt: now,
        createdAt: now,
      });

      /*
       * ------------------------------------
       * ATUALIZA PROGRESSO GLOBAL
       * ------------------------------------
       */

      transaction.set(progressRef, updatedProgress, {
        merge: true,
      });

      /*
       * ------------------------------------
       * RESPOSTA
       * ------------------------------------
       */

      responseData = {
        xp: {
          added: xpReward,
          previous: oldTotalXp,
          current: newTotalXp,
        },
        levelUp: currentLevel.levelNumber > oldLevelNumber,
        level: {
          previous: oldLevelNumber,
          current: currentLevel.levelNumber,
          title: currentLevel.name,
          progressPercent,
        },
        streak: {
          updated: streakResult.changed,
          ...streakResult.streak,
        },
        rewards: [...accessRewardResult.granted, ...rewardResult.granted],
        progress: updatedProgress,
      };
    });

    /*
     * ========================================
     * RESPONSE
     * ========================================
     */

    if (!responseData) {
      throw new Error("Não foi possível calcular o resultado da partida.");
    }

    recordHeatmapActivity(userId);

    return res.status(200).json({
      message: "Jogo concluído com sucesso.",

      game: {
        id,
        name: game.name,
      },

      result: {
        score: Number(score) || 0,
        timeSeconds: Number(timeSeconds) || 0,
        correctAnswers: Number(correctAnswers) || 0,
        totalAnswers: Number(totalAnswers) || 0,
        perfectRun: Boolean(perfectRun),
        won: Boolean(won),
      },

      ...responseData,
    });
  } catch (err) {
    console.error("Erro ao concluir jogo:", err);

    if (err instanceof Error && err.message === "GAME_LOCKED") {
      return res.status(403).json({
        message: "Este jogo ainda não foi desbloqueado.",
      });
    }

    return res.status(500).json({
      message: "Erro ao concluir jogo.",

      error: err instanceof Error ? err.message : "Erro desconhecido.",
    });
  }
};
