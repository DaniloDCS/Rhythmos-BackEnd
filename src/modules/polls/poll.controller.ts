import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { getPollErrorStatus, PollService } from "./poll.service";

export const getPoll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid)
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    const state = await PollService.getState({
      lessonId: req.params.lessonId,
      versionId: req.params.versionId,
      blockId: req.params.blockId,
      userId: req.user.uid,
    });
    return res.status(200).json(state);
  } catch (error) {
    return res.status(getPollErrorStatus(error)).json({
      message:
        error instanceof Error ? error.message : "Erro ao buscar enquete.",
    });
  }
};

export const votePoll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid)
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    const state = await PollService.vote({
      lessonId: req.params.lessonId,
      versionId: req.params.versionId,
      blockId: req.params.blockId,
      userId: req.user.uid,
      optionIds: req.body?.optionIds,
    });
    return res.status(200).json(state);
  } catch (error) {
    return res.status(getPollErrorStatus(error)).json({
      message:
        error instanceof Error ? error.message : "Erro ao registrar voto.",
    });
  }
};
