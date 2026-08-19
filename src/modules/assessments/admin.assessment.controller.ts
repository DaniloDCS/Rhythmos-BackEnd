import type { Request, Response } from "express";

import { db } from "../../config/firebase";

import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";

import { Assessment } from "./assessment.model";

import {
  AssessmentService,
  getAssessmentErrorStatus,
} from "./assessment.service";

export const createAssessment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const assessment = await AssessmentService.create(req.body, req.user?.uid);
    return res.status(201).json({ assessment: assessment.toObject() });
  } catch (error) {
    return res.status(getAssessmentErrorStatus(error)).json({
      message:
        error instanceof Error ? error.message : "Erro ao criar avaliação.",
    });
  }
};

export const updateAssessment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const assessment = await AssessmentService.update(
      req.params.id,
      req.body,
      req.user?.uid,
    );
    return res.status(200).json({ assessment: assessment.toObject() });
  } catch (error) {
    return res.status(getAssessmentErrorStatus(error)).json({
      message:
        error instanceof Error ? error.message : "Erro ao atualizar avaliação.",
    });
  }
};

export const getAssessmentAdmin = async (req: Request, res: Response) => {
  try {
    const assessment = await AssessmentService.getById(req.params.id);
    return res.status(200).json(assessment.toObject());
  } catch (error) {
    return res.status(getAssessmentErrorStatus(error)).json({
      message:
        error instanceof Error ? error.message : "Erro ao buscar avaliação.",
    });
  }
};

export const listAssessmentsAdmin = async (req: Request, res: Response) => {
  try {
    let query: FirebaseFirestore.Query = db.collection("assessments");
    if (typeof req.query.moduleId === "string" && req.query.moduleId) {
      query = query.where("moduleId", "==", req.query.moduleId);
    }
    if (typeof req.query.lessonId === "string" && req.query.lessonId) {
      query = query.where("lessonId", "==", req.query.lessonId);
    }
    const snapshot = await query.get();
    return res
      .status(200)
      .json(
        snapshot.docs.map((doc) =>
          Assessment.fromFirestore(doc.id, doc.data()).toObject(),
        ),
      );
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Erro ao listar avaliações.",
    });
  }
};

export const deleteAssessment = async (req: Request, res: Response) => {
  try {
    await AssessmentService.delete(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(getAssessmentErrorStatus(error)).json({
      message:
        error instanceof Error ? error.message : "Erro ao excluir avaliação.",
    });
  }
};
