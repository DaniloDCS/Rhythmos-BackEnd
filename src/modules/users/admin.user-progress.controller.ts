import { Request, Response } from "express";

import { UserProgressModel } from "./user-progress.model";

import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

import { Timestamp } from "firebase-admin/firestore";

import { IUserProgress } from "./user-progress.types";

import { ILevel } from "../levels/level.model";

import { db } from "../../config/firebase";

import {
  grantRewardsInTransaction,
  grantRewardsToUser,
} from "../rewards/reward.service";
import { syncUserBadges } from "../badges/badge-award.service";
import { userGamificationRef } from "../gamification/user-gamification.repository";
import { AcademicIndicesService } from "../enrollments/academic-indices.service";
import type { IEnrollment } from "../enrollments/enrollment.types";

export const AcademicIndicesGetByUserId = async (
  req: Request,
  res: Response,
) => {
  try {
    const snapshot = await db
      .collection("enrollments")
      .where("userId", "==", req.params.id)
      .get();
    const results = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const enrollment = { id: doc.id, ...doc.data() } as IEnrollment & {
          id: string;
        };
        const trailDoc = await db
          .collection("trails")
          .doc(enrollment.trailId)
          .get();
        return {
          enrollmentId: enrollment.id,
          trailId: enrollment.trailId,
          trailTitle: String(trailDoc.data()?.title ?? "Trilha"),
          status: enrollment.status,
          indices: await AcademicIndicesService.calculate(enrollment),
        };
      }),
    );
    return res.status(200).json({ userId: req.params.id, results });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erro ao calcular indicadores acadêmicos.", error });
  }
};

export const ProgressCreate = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório.",
      });
    }
    const alreadyExists = await UserProgressModel.getById(id);
    if (alreadyExists) {
      return res.status(409).json({
        error: "CONFLICT",
        message: "Progresso deste usuário já existe.",
      });
    }
    const levelsSnapshot = await db
      .collection("levels")
      .where("active", "==", true)
      .get();
    const levels = levelsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ILevel[];
    levels.sort((a, b) => a.levelNumber - b.levelNumber);
    const initialLevel = levels[0];
    if (!initialLevel) {
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Nenhum nível ativo foi cadastrado.",
      });
    }
    const levelRange = initialLevel.xpMax - initialLevel.xpMin;
    const initialData: IUserProgress = {
      userId: id,
      xp: {
        total: 0,
        currentLevelXp: 0,
        nextLevelXp: levelRange,
      },
      level: {
        current: initialLevel.levelNumber,
        currentTitle: initialLevel.name,
        progressPercent: 0,
      },
      levels: [
        {
          level: initialLevel.levelNumber,
          title: initialLevel.name,
          unlocked: true,
          reachedAt: new Date().toISOString(),
        },
      ],
      games: {
        played: 0,
        completed: 0,
        wins: 0,
        perfectRuns: 0,
        totalPlayTimeSeconds: 0,
        lastPlayedAt: null,
      },
      badges: [],
      rewards: [],
      unlocked: {
        games: {},
        trails: {},
        modules: {},
      },
      streak: {
        current: 0,
        best: 0,
        lastActivityDate: null,
      },
      stats: {
        quizzesCompleted: 0,
        simulationsCompleted: 0,
        trailsCompleted: 0,
        supportMaterialsViewed: 0,
      },
      active: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const created = await UserProgressModel.create(initialData);
    const initialRewardRequests = (initialLevel.rewardIds ?? []).map(
      (rewardId) => ({
        rewardId,
        source: {
          type: "level" as const,
          id: initialLevel.id ?? String(initialLevel.levelNumber),
        },
      }),
    );
    if (!initialRewardRequests.length) {
      return res.status(201).json(created);
    }
    const rewardResult = await grantRewardsToUser(id, initialRewardRequests);
    return res.status(201).json({
      ...rewardResult.progress,
      grantedRewards: rewardResult.granted,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao criar progresso do usuário.",
      error,
    });
  }
};

export const ProgressGetAll = async (_req: Request, res: Response) => {
  try {
    const data = await UserProgressModel.getAll();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar progressos.",
      error,
    });
  }
};

export const ProgressGetByUserId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await UserProgressModel.getById(id);
    if (!data) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Progresso do usuário não encontrado.",
      });
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar progresso do usuário.",
      error,
    });
  }
};

export const ProgressUpdate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const exists = await UserProgressModel.getById(id);
    if (!exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Progresso não encontrado.",
      });
    }
    const updated = await UserProgressModel.update(id, body);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao atualizar progresso.",
      error,
    });
  }
};

export const ProgressAddXp = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }
    const id = req.user.uid;
    const { amount } = req.body;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "amount deve ser um número maior que zero.",
      });
    }
    const levelsSnapshot = await db.collection("levels").get();
    if (levelsSnapshot.empty) {
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Nenhum nível foi cadastrado.",
      });
    }
    const availableLevels = levelsSnapshot.docs
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
        error: "INTERNAL_SERVER_ERROR",
        message: "Nenhum nível ativo foi cadastrado.",
      });
    }
    const progressRef = userGamificationRef(id);
    const result = await db.runTransaction(async (transaction) => {
      const progressDoc = await transaction.get(progressRef);
      if (!progressDoc.exists) {
        throw new Error("PROGRESS_NOT_FOUND");
      }
      const progress = progressDoc.data() as IUserProgress;
      const oldTotalXp = progress.xp.total ?? 0;
      const oldLevelNumber = progress.level.current ?? 1;
      const newTotalXp = oldTotalXp + amount;
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
        : currentLevel.xpMax - currentLevel.xpMin;
      let progressPercent = 100;
      if (nextLevel && levelXpRange > 0) {
        progressPercent = Math.min(
          100,
          Number(((currentLevelXp / levelXpRange) * 100).toFixed(2)),
        );
      }
      const updatedLevels = [...(progress.levels ?? [])];
      const newlyUnlockedLevels = availableLevels.filter(
        (level) =>
          level.levelNumber > oldLevelNumber &&
          level.levelNumber <= currentLevel.levelNumber,
      );
      const reachedAt = new Date().toISOString();
      for (const level of newlyUnlockedLevels) {
        if (!updatedLevels.some((item) => item.level === level.levelNumber)) {
          updatedLevels.push({
            level: level.levelNumber,
            title: level.name,
            unlocked: true,
            reachedAt,
          });
        }
      }
      updatedLevels.sort((a, b) => a.level - b.level);
      const rewardRequests = availableLevels
        .filter((level) => level.levelNumber <= currentLevel.levelNumber)
        .flatMap((level) =>
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
        progress,
        rewardRequests,
      );
      const payload: Partial<IUserProgress> = {
        xp: {
          total: newTotalXp,
          currentLevelXp: nextLevel
            ? currentLevelXp
            : Math.min(currentLevelXp, Math.max(levelXpRange, 0)),
          nextLevelXp: Math.max(levelXpRange, 0),
        },
        level: {
          current: currentLevel.levelNumber,
          currentTitle: currentLevel.name,
          progressPercent,
        },
        levels: updatedLevels,
        badges: rewardResult.progress.badges,
        rewards: rewardResult.progress.rewards,
        unlocked: rewardResult.progress.unlocked,
        updatedAt: Timestamp.now(),
      };
      transaction.update(progressRef, payload);
      return {
        progress: { ...progress, ...payload } as IUserProgress,
        oldLevelNumber,
        currentLevel,
        newlyUnlockedLevels,
        grantedRewards: rewardResult.granted,
        xpAdded: amount,
        oldTotalXp,
        newTotalXp,
      };
    });
    const leveledUp = result.currentLevel.levelNumber > result.oldLevelNumber;
    const badgeResult = await syncUserBadges(id);
    return res.status(200).json({
      message: leveledUp
        ? `Parabéns! Você alcançou o nível ${result.currentLevel.levelNumber}: ${result.currentLevel.name}.`
        : `${amount} XP adicionados com sucesso.`,
      xpAdded: result.xpAdded,
      xp: {
        previous: result.oldTotalXp,
        current: result.newTotalXp,
      },
      levelUp: leveledUp,
      level: {
        previous: result.oldLevelNumber,
        current: result.currentLevel.levelNumber,
        title: result.currentLevel.name,
        progressPercent: result.progress.level.progressPercent,
      },
      unlockedLevels: result.newlyUnlockedLevels.map((level) => ({
        id: level.id,
        levelNumber: level.levelNumber,
        name: level.name,
        badgeName: level.badgeName ?? null,
        badgeImageUrl: level.badgeImageUrl ?? null,
        rewardIds: level.rewardIds ?? [],
      })),
      rewards: result.grantedRewards,
      newlyUnlockedBadges: badgeResult.newlyUnlocked,
      progress: badgeResult.progress,
    });
  } catch (error) {
    console.error("Erro ao adicionar XP:", error);
    if (error instanceof Error && error.message === "PROGRESS_NOT_FOUND") {
      return res.status(404).json({
        error: error instanceof Error ? error.message : String(error),
        message: "Progresso não encontrado.",
      });
    }
    return res.status(500).json({
      message: "Erro ao adicionar XP.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const ProgressDelete = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exists = await UserProgressModel.getById(id);
    if (!exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Progresso não encontrado.",
      });
    }
    await UserProgressModel.delete(id);
    return res.status(200).json({
      message: "Progresso removido com sucesso.",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao remover progresso.",
      error,
    });
  }
};

const getLocalDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getPreviousDateString = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
};

export const addXpToUser = async (id: string, amount: number) => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("INVALID_XP_AMOUNT");
  }

  const levelsSnapshot = await db.collection("levels").get();

  if (levelsSnapshot.empty) {
    throw new Error("LEVELS_NOT_FOUND");
  }

  const availableLevels = levelsSnapshot.docs
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
    throw new Error("ACTIVE_LEVELS_NOT_FOUND");
  }

  const progressRef = userGamificationRef(id);

  return db.runTransaction(async (transaction) => {
    const progressDoc = await transaction.get(progressRef);

    if (!progressDoc.exists) {
      throw new Error("PROGRESS_NOT_FOUND");
    }

    const progress = progressDoc.data() as IUserProgress;

    const oldTotalXp = progress.xp.total ?? 0;
    const oldLevelNumber = progress.level.current ?? 1;
    const newTotalXp = oldTotalXp + amount;

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
      : currentLevel.xpMax - currentLevel.xpMin;

    let progressPercent = 100;

    if (nextLevel && levelXpRange > 0) {
      progressPercent = Math.min(
        100,
        Number(((currentLevelXp / levelXpRange) * 100).toFixed(2)),
      );
    }

    const updatedLevels = [...(progress.levels ?? [])];

    const newlyUnlockedLevels = availableLevels.filter(
      (level) =>
        level.levelNumber > oldLevelNumber &&
        level.levelNumber <= currentLevel.levelNumber,
    );

    const reachedAt = new Date().toISOString();

    for (const level of newlyUnlockedLevels) {
      if (!updatedLevels.some((item) => item.level === level.levelNumber)) {
        updatedLevels.push({
          level: level.levelNumber,
          title: level.name,
          unlocked: true,
          reachedAt,
        });
      }
    }

    updatedLevels.sort((a, b) => a.level - b.level);

    const updatedBadges = [...(progress.badges ?? [])];

    for (const level of newlyUnlockedLevels) {
      if (!level.badgeName) continue;

      const badgeId = level.id ?? `level-${level.levelNumber}`;

      if (!updatedBadges.some((badge) => badge.badgeId === badgeId)) {
        updatedBadges.push({
          badgeId,
          name: level.badgeName,
          unlockedAt: reachedAt,
        });
      }
    }

    const rewardRequests = availableLevels
      .filter((level) => level.levelNumber <= currentLevel.levelNumber)
      .flatMap((level) =>
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
      progress,
      rewardRequests,
    );

    const payload: Partial<IUserProgress> = {
      xp: {
        total: newTotalXp,
        currentLevelXp: nextLevel
          ? currentLevelXp
          : Math.min(currentLevelXp, Math.max(levelXpRange, 0)),
        nextLevelXp: Math.max(levelXpRange, 0),
      },
      level: {
        current: currentLevel.levelNumber,
        currentTitle: currentLevel.name,
        progressPercent,
      },
      levels: updatedLevels,
      badges: updatedBadges,
      rewards: rewardResult.progress.rewards,
      unlocked: rewardResult.progress.unlocked,
      updatedAt: Timestamp.now(),
    };

    transaction.update(progressRef, payload);

    return {
      progress: {
        ...progress,
        ...payload,
      } as IUserProgress,
      xpAdded: amount,
      oldTotalXp,
      newTotalXp,
      oldLevelNumber,
      currentLevel,
      newlyUnlockedLevels,
      rewards: rewardResult.granted,
    };
  });
};
