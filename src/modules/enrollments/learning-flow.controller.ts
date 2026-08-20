import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  getLearningFlowErrorStatus,
  LearningFlowService,
} from "./learning-flow.service";
import { addXpToUser } from "../users/admin.user-progress.controller";
import {
  recordXpActivityAward,
  resolveXpAwardForUser,
} from "../xp-activity-rules/xp-activity-rule.service";
import { heatmapService } from "../heatmap/heatmap.service";

const errorResponse = (res: Response, error: unknown) =>
  res.status(getLearningFlowErrorStatus(error)).json({
    message:
      error instanceof Error ? error.message : "Erro no fluxo de aprendizagem.",
  });

export const getCurrentLearningStep = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.uid)
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    return res
      .status(200)
      .json(
        await LearningFlowService.getCurrentStep(req.params.id, req.user.uid),
      );
  } catch (error) {
    return errorResponse(res, error);
  }
};

export const completeLessonFlow = async (
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

    const userId = req.user.uid;
    const lessonId = String(req.body?.lessonId ?? "").trim();

    if (!lessonId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "lessonId é obrigatório.",
      });
    }

    const result = await LearningFlowService.completeContentLesson({
      enrollmentId: req.params.id,
      userId,
      lessonId,
    });

    let xpResult: Awaited<ReturnType<typeof addXpToUser>> | null = null;

    if (result.newlyCompletedLesson) {
      const xpAward = await resolveXpAwardForUser(
        "lesson_completed",
        0,
        userId,
        lessonId,
      );

      if (xpAward.xp > 0) {
        xpResult = await addXpToUser(userId, xpAward.xp);

        await recordXpActivityAward(
          userId,
          "lesson_completed",
          xpAward.xp,
          lessonId,
        );
      }

      await heatmapService.recordActivity(userId);
    }

    const nextLesson =
      result.nextStep.type === "lesson" || result.nextStep.type === "practice"
        ? await LearningFlowService.getLesson(result.nextStep.lessonId)
        : null;

    return res.status(200).json({
      message: result.trailCompleted
        ? "Trilha concluída com sucesso."
        : "Aula concluída com sucesso.",
      ...result,
      nextLesson,
      xp: xpResult
        ? {
            added: xpResult.xpAdded,
            previous: xpResult.oldTotalXp,
            current: xpResult.newTotalXp,
          }
        : {
            added: 0,
          },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

export const completePracticeFlow = async (
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

    const userId = req.user.uid;
    const lessonId = String(req.body?.lessonId ?? "").trim();
    const activityId = String(req.body?.activityId ?? "").trim();

    if (!lessonId || !activityId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "lessonId e activityId são obrigatórios.",
      });
    }

    const result = await LearningFlowService.completePractice({
      enrollmentId: req.params.id,
      userId,
      lessonId,
      activityId,
      score: typeof req.body?.score === "number" ? req.body.score : undefined,
    });

    let xpResult: Awaited<ReturnType<typeof addXpToUser>> | null = null;

    if (result.newlyCompletedLesson) {
      const xpAward = await resolveXpAwardForUser(
        "lesson_completed",
        0,
        userId,
        lessonId,
      );

      if (xpAward.xp > 0) {
        xpResult = await addXpToUser(userId, xpAward.xp);

        await recordXpActivityAward(
          userId,
          "lesson_completed",
          xpAward.xp,
          lessonId,
        );
      }

      await heatmapService.recordActivity(userId);
    }

    return res.status(200).json({
      message: result.trailCompleted
        ? "Trilha concluída com sucesso."
        : "Prática concluída com sucesso.",
      ...result,
      xp: xpResult
        ? {
            added: xpResult.xpAdded,
            previous: xpResult.oldTotalXp,
            current: xpResult.newTotalXp,
          }
        : {
            added: 0,
          },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
