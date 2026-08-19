import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { sketchbookService } from "./sketchbook.service";

const handleSketchbookError = (error: unknown, res: Response) => {
  const code = error instanceof Error ? error.message : "";

  const errors: Record<string, { status: number; message: string }> = {
    SKETCHBOOK_INVALID_TITLE: {
      status: 400,
      message: "O título da aba é obrigatório.",
    },
    SKETCHBOOK_TITLE_TOO_LONG: {
      status: 400,
      message: "O título da aba deve ter no máximo 48 caracteres.",
    },
    SKETCHBOOK_INVALID_COLOR: {
      status: 400,
      message: "A cor da aba deve estar no formato hexadecimal.",
    },
    SKETCHBOOK_CONTENT_TOO_LONG: {
      status: 400,
      message: "A anotação ultrapassou o limite de 50.000 caracteres.",
    },
    SKETCHBOOK_INVALID_ORDER: {
      status: 400,
      message: "A ordem da aba é inválida.",
    },
  };

  const mapped = errors[code];

  if (mapped) {
    return res.status(mapped.status).json({
      message: mapped.message,
    });
  }

  console.error("Erro no Sketchbook:", error);

  return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Não foi possível processar o Sketchbook.",
  });
};

export const getSketchbookTabs = async (
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

    const tabs = await sketchbookService.list(req.user.uid);

    return res.status(200).json(tabs);
  } catch (error) {
    return handleSketchbookError(error, res);
  }
};

export const createSketchbookTab = async (
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

    const tab = await sketchbookService.create(req.user.uid, req.body ?? {});

    return res.status(201).json(tab);
  } catch (error) {
    return handleSketchbookError(error, res);
  }
};

export const updateSketchbookTab = async (
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

    const tab = await sketchbookService.update(
      req.user.uid,
      req.params.id,
      req.body ?? {},
    );

    if (!tab) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aba do Sketchbook não encontrada.",
      });
    }

    return res.status(200).json(tab);
  } catch (error) {
    return handleSketchbookError(error, res);
  }
};

export const deleteSketchbookTab = async (
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

    const deleted = await sketchbookService.delete(req.user.uid, req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aba do Sketchbook não encontrada.",
      });
    }

    return res.status(200).json({
      message: "Aba excluída com sucesso.",
    });
  } catch (error) {
    return handleSketchbookError(error, res);
  }
};
