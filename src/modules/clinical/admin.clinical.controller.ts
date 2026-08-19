import type { Response } from "express";

import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";

import { ClinicalError, clinicalService } from "./clinical.service";

import type { ClinicalCaseStatus, ClinicalStepAnswers } from "./clinical.types";

const handleError = (res: Response, error: unknown, message: string) => {
  if (error instanceof ClinicalError) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(message, error);
  return res.status(500).json({
    message,
    error: error instanceof Error ? error.message : "Erro desconhecido.",
  });
};

export class ClinicalController {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Usuário não autenticado.",
        });
      }

      return res
        .status(200)
        .json(await clinicalService.listPublic(req.user.uid));
    } catch (error) {
      return handleError(res, error, "Erro ao carregar casos clínicos.");
    }
  }

  async answer(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Usuário não autenticado.",
        });
      }

      const analysis = req.body?.analysis;
      const answer = String(req.body?.answer ?? "").trim();

      if (
        !analysis ||
        typeof analysis !== "object" ||
        Array.isArray(analysis)
      ) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "analysis é obrigatório.",
        });
      }

      if (!answer) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "answer é obrigatório.",
        });
      }

      const normalizedAnalysis = Object.fromEntries(
        Object.entries(analysis as Record<string, unknown>).map(
          ([key, value]) => [key, String(value ?? "")],
        ),
      ) as ClinicalStepAnswers;

      const result = await clinicalService.answer(
        req.user.uid,
        req.params.id,
        normalizedAnalysis,
        answer,
      );

      return res.status(200).json(result);
    } catch (error) {
      return handleError(res, error, "Erro ao validar caso clínico.");
    }
  }

  async listAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const cursor =
        typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      return res
        .status(200)
        .json(await clinicalService.listAdmin(limit, cursor));
    } catch (error) {
      return handleError(res, error, "Erro ao listar casos clínicos.");
    }
  }

  async getAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      return res
        .status(200)
        .json(await clinicalService.getAdmin(req.params.id));
    } catch (error) {
      return handleError(res, error, "Erro ao buscar caso clínico.");
    }
  }

  async stats(_req: AuthenticatedRequest, res: Response) {
    try {
      return res.status(200).json(await clinicalService.stats());
    } catch (error) {
      return handleError(res, error, "Erro ao buscar métricas do Clinical.");
    }
  }

  async attempts(req: AuthenticatedRequest, res: Response) {
    try {
      return res
        .status(200)
        .json(await clinicalService.attempts(req.params.id));
    } catch (error) {
      return handleError(res, error, "Erro ao buscar tentativas do caso.");
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Usuário não autenticado.",
        });
      }

      const clinicalCase = await clinicalService.create(
        req.body ?? {},
        req.user.uid,
      );
      return res.status(201).json(clinicalCase);
    } catch (error) {
      return handleError(res, error, "Erro ao criar caso clínico.");
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Usuário não autenticado.",
        });
      }

      const clinicalCase = await clinicalService.update(
        req.params.id,
        req.body ?? {},
        req.user.uid,
      );

      return res.status(200).json({
        message: "Caso clínico atualizado com sucesso.",
        clinicalCase,
      });
    } catch (error) {
      return handleError(res, error, "Erro ao atualizar caso clínico.");
    }
  }

  async status(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Usuário não autenticado.",
        });
      }

      const status = String(req.body?.status ?? "") as ClinicalCaseStatus;
      if (!["rascunho", "publicado", "arquivado"].includes(status)) {
        return res
          .status(400)
          .json({ error: "VALIDATION_ERROR", message: "Status inválido." });
      }

      const clinicalCase = await clinicalService.updateStatus(
        req.params.id,
        status,
        req.user.uid,
      );

      return res.status(200).json({
        message: "Status atualizado com sucesso.",
        clinicalCase,
      });
    } catch (error) {
      return handleError(res, error, "Erro ao atualizar status.");
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      await clinicalService.delete(req.params.id);
      return res
        .status(200)
        .json({ message: "Caso clínico excluído com sucesso." });
    } catch (error) {
      return handleError(res, error, "Erro ao excluir caso clínico.");
    }
  }
}
