import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import type { RhythmSketchValidationRequest } from "./rhythm-sketch.types";
import { rhythmSketchService } from "./rhythm-sketch.service";

const handleError = (error: unknown, res: Response) => {
  const code = error instanceof Error ? error.message : "";

  const known: Record<string, { status: number; message: string }> = {
    RHYTHM_SKETCH_CHALLENGE_REQUIRED: {
      status: 400,
      message: "challengeId é obrigatório.",
    },

    RHYTHM_SKETCH_POINTS_REQUIRED: {
      status: 400,
      message: "Os pontos do desenho são obrigatórios.",
    },

    RHYTHM_SKETCH_TOO_MANY_POINTS: {
      status: 400,
      message: "O desenho contém pontos demais para validação.",
    },

    RHYTHM_SKETCH_CHALLENGE_NOT_FOUND: {
      status: 404,
      message: "Desafio não encontrado.",
    },

    RHYTHM_SKETCH_CHALLENGE_FORBIDDEN: {
      status: 403,
      message: "Este desafio pertence a outro usuário.",
    },

    RHYTHM_SKETCH_CHALLENGE_EXPIRED: {
      status: 410,
      message: "Este desafio expirou. Sorteie um novo ritmo.",
    },

    RHYTHM_SKETCH_CHALLENGE_COMPLETED: {
      status: 409,
      message: "Este desafio já foi concluído.",
    },

    RHYTHM_SKETCH_MAX_ATTEMPTS: {
      status: 409,
      message: "As três tentativas deste desafio já foram utilizadas.",
    },

    RHYTHM_SKETCH_RULE_NOT_FOUND: {
      status: 500,
      message: "Não foi possível localizar as regras do ritmo.",
    },
  };

  const mapped = known[code];

  if (mapped) {
    return res.status(mapped.status).json({ message: mapped.message });
  }

  console.error("Erro no RhythmSketch:", error);

  return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Não foi possível processar o jogo de desenho de ritmos.",
  });
};

export const createRhythmSketchChallenge = async (
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

    const challenge = await rhythmSketchService.createChallenge(req.user.uid);

    return res.status(201).json(challenge);
  } catch (error) {
    return handleError(error, res);
  }
};

export const validateRhythmSketchChallenge = async (
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

    const body = (req.body ?? {}) as RhythmSketchValidationRequest;

    const result = await rhythmSketchService.validate(
      req.user.uid,
      body.challengeId,
      body.points,
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res);
  }
};
