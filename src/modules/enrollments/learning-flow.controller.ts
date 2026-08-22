import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  getLearningFlowErrorStatus,
  LearningFlowService,
} from "./learning-flow.service";
import { GamificationService } from "../gamification/gamification.service";
import { heatmapService } from "../heatmap/heatmap.service";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";

const errorResponse = (res: Response, error: unknown) =>
  res.status(getLearningFlowErrorStatus(error)).json({
    message:
      error instanceof Error ? error.message : "Erro no fluxo de aprendizagem.",
  });

const awardLearningEvents = async (
  userId: string,
  enrollmentId: string,
  lessonId: string,
  result: Awaited<ReturnType<typeof LearningFlowService.completeContentLesson>>,
) => {
  const awards = [];
  if (result.newlyCompletedLesson) {
    awards.push(await GamificationService.awardEvent({
      userId, event: "lesson_completed", sourceId: lessonId,
      idempotencyKey: `lesson_${userId}_${lessonId}`,
    }));
  }
  if (result.newlyCompletedModule && result.newlyCompletedModuleId) {
    awards.push(await GamificationService.awardEvent({
      userId, event: "module_completed", sourceId: result.newlyCompletedModuleId,
      idempotencyKey: `module_${userId}_${result.newlyCompletedModuleId}`,
    }));
  }
  if (result.newlyCompletedTrail) {
    awards.push(await GamificationService.awardEvent({
      userId, event: "trail_completed", sourceId: result.enrollment.trailId,
      idempotencyKey: `trail_${userId}_${result.enrollment.trailId}`,
    }));
  }
  const added = awards.reduce((sum, item) => sum + item.xp.added, 0);
  if (added > 0) {
    await db.collection("enrollments").doc(enrollmentId).set({ xp: FieldValue.increment(added) }, { merge: true });
    result.enrollment.xp = Number(result.enrollment.xp ?? 0) + added;
  }
  return { awards, added };
};

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

    const gamification = await awardLearningEvents(userId, req.params.id, lessonId, result);
    if (result.newlyCompletedLesson) {
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
      xp: { added: gamification.added, events: gamification.awards.map((item) => item.xp) },
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

    const gamification = await awardLearningEvents(userId, req.params.id, lessonId, result);
    if (result.newlyCompletedLesson) {
      await heatmapService.recordActivity(userId);
    }

    return res.status(200).json({
      message: result.trailCompleted
        ? "Trilha concluída com sucesso."
        : "Prática concluída com sucesso.",
      ...result,
      xp: { added: gamification.added, events: gamification.awards.map((item) => item.xp) },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
