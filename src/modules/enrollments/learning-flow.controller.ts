import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import {
  getLearningFlowErrorStatus,
  LearningFlowService,
} from "./learning-flow.service";

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
    if (!req.user?.uid)
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    const lessonId = String(req.body?.lessonId ?? "").trim();
    if (!lessonId)
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "lessonId é obrigatório.",
      });

    const result = await LearningFlowService.completeContentLesson({
      enrollmentId: req.params.id,
      userId: req.user.uid,
      lessonId,
    });

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
    if (!req.user?.uid)
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
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
      userId: req.user.uid,
      lessonId,
      activityId,
      score: typeof req.body?.score === "number" ? req.body.score : undefined,
    });

    return res.status(200).json({
      message: result.trailCompleted
        ? "Trilha concluída com sucesso."
        : "Prática concluída com sucesso.",
      ...result,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
