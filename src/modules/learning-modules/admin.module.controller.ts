import { Request, Response } from "express";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { Module } from "./module.model";

import { Lesson } from "../lessons/lesson.model";

import { db } from "../../config/firebase";

import { AuthenticatedRequest } from "../../middlewares/auth.middleware";

const MODULES_COLLECTION = "modules";

const USER_MODULE_PROGRESS_COLLECTION = "userModuleProgress";

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  return fallback;
};

export const getModulesByTrail = async (req: Request, res: Response) => {
  try {
    const { trailId } = req.params;
    let query = db
      .collection(MODULES_COLLECTION)
      .where("trailId", "==", trailId)
      .orderBy("sequence", "asc");

    const snapshot = await query.get();

    let modules = snapshot.docs.map((doc) =>
      Module.fromFirestore(doc.id, doc.data()),
    );

    return res.status(200).json(modules);
  } catch (err) {
    console.error("Erro ao buscar módulos da trilha:", err);
    return res.status(500).json({
      message: "Erro ao buscar módulos da trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getLessonsByModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let query = db.collection("lessons").where("moduleId", "==", id);

    const snapshot = await query.get();

    let lesssons = snapshot.docs.map((doc) =>
      Lesson.fromFirestore(doc.id, doc.data()),
    );

    return res.status(200).json(lesssons);
  } catch (err) {
    console.error("Erro ao buscar aulas do módulo:", err);
    return res.status(500).json({
      message: "Erro ao buscar aulas do módulo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const createModule = async (req: Request, res: Response) => {
  try {
    const {
      trailId,
      title,
      shortDescription,
      description,
      sequence,
      status,
      level,
      category,
      tags,
      published,
      prerequisiteModuleIds,
      lessonIds,
      quizIds,
      activityIds,
      finalAssessmentId,
      totalLessons,
      totalQuizzes,
      totalActivities,
      estimatedMinutes,
      workloadHours,
      thumbnailUrl,
      visibility,
      featured,
      createdBy,
      responsibleInstructorId,
      changeLog,
    } = req.body;

    if (!trailId || !title || !description || sequence === undefined) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "trailId, title, description e sequence são obrigatórios",
      });
    }

    const trailRef = db.collection("trails").doc(trailId);
    const trailDoc = await trailRef.get();

    if (!trailDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada.",
      });
    }

    const moduleRef = db.collection(MODULES_COLLECTION).doc();
    const moduleId = moduleRef.id;

    const module = new Module({
      id: moduleId,
      trailId,
      title,
      shortDescription,
      description,
      sequence,
      status: status ?? "em_construcao",
      level: level ?? "basico",
      category,
      tags: normalizeStringArray(tags),
      published: published ?? false,
      prerequisiteModuleIds: normalizeStringArray(prerequisiteModuleIds),
      lessonIds: normalizeStringArray(lessonIds),
      quizIds: normalizeStringArray(quizIds),
      activityIds: normalizeStringArray(activityIds),
      finalAssessmentId:
        typeof finalAssessmentId === "string" ? finalAssessmentId : undefined,
      totalLessons,
      totalQuizzes,
      totalActivities,
      estimatedMinutes,
      workloadHours,
      thumbnailUrl,
      visibility: visibility ?? "privada",
      featured: parseBoolean(featured, false),
      createdBy,
      responsibleInstructorId,
      changeLog,
      createdAt: Timestamp.now(),
    });

    module.validate();

    if (published === true) module.publish(createdBy);

    const batch = db.batch();

    batch.set(moduleRef, module.toObject());

    batch.update(trailRef, {
      totalModules: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
      updatedBy: createdBy,
    });

    await batch.commit();

    return res.status(201).json(module.toObject());
  } catch (err) {
    console.error("Erro ao criar módulo:", err);

    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao criar módulo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllModules = async (_: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(MODULES_COLLECTION)
      .orderBy("sequence", "asc")
      .get();

    const modules = snapshot.docs.map((doc) =>
      Module.fromFirestore(doc.id, doc.data()).toObject(),
    );

    return res.status(200).json(modules);
  } catch (err) {
    console.error("Erro ao buscar módulos:", err);
    return res.status(500).json({
      message: "Erro ao buscar módulos",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateModule = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { publishNow } = req.body;

    if (!req.user?.uid)
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });

    const updatedBy = req.user.uid;

    const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
    const doc = await moduleRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Módulo não encontrado",
      });
    }

    const module = Module.fromFirestore(doc.id, doc.data()!);

    module.update(
      {
        trailId: req.body.trailId,
        title: req.body.title,
        shortDescription: req.body.shortDescription,
        description: req.body.description,
        sequence: req.body.sequence,
        status: req.body.status,
        level: req.body.level,
        category: req.body.category,
        tags: Array.isArray(req.body.tags)
          ? normalizeStringArray(req.body.tags)
          : undefined,
        published: req.body.published,
        prerequisiteModuleIds: Array.isArray(req.body.prerequisiteModuleIds)
          ? normalizeStringArray(req.body.prerequisiteModuleIds)
          : undefined,
        lessonIds: Array.isArray(req.body.lessonIds)
          ? normalizeStringArray(req.body.lessonIds)
          : undefined,
        quizIds: Array.isArray(req.body.quizIds)
          ? normalizeStringArray(req.body.quizIds)
          : undefined,
        activityIds: Array.isArray(req.body.activityIds)
          ? normalizeStringArray(req.body.activityIds)
          : undefined,
        finalAssessmentId:
          req.body.finalAssessmentId === null
            ? undefined
            : typeof req.body.finalAssessmentId === "string"
              ? req.body.finalAssessmentId
              : undefined,
        totalLessons: req.body.totalLessons,
        totalQuizzes: req.body.totalQuizzes,
        totalActivities: req.body.totalActivities,
        estimatedMinutes: req.body.estimatedMinutes,
        workloadHours: req.body.workloadHours,
        thumbnailUrl: req.body.thumbnailUrl,
        visibility: req.body.visibility,
        featured: req.body.featured,
        responsibleInstructorId: req.body.responsibleInstructorId,
        changeLog: req.body.changeLog,
      },
      updatedBy,
    );

    if (req.body.finalAssessmentId === null) {
      module.finalAssessmentId = undefined;
    }

    if (publishNow === true) {
      module.publish(updatedBy);
    }

    if (req.body.status === "disponivel") {
      const lessonsSnap = await db
        .collection("lessons")
        .where("moduleId", "==", id)
        .get();

      const batch = db.batch();

      for (const lessonDoc of lessonsSnap.docs) {
        const lesson = lessonDoc.data();

        batch.update(lessonDoc.ref, {
          status: "disponivel",
          updatedAt: Timestamp.now(),
          updatedBy,
        });

        if (lesson.currentVersionId) {
          const versionRef = lessonDoc.ref
            .collection("versions")
            .doc(lesson.currentVersionId);

          batch.update(versionRef, {
            status: "publicada",
            publishedAt: Timestamp.now(),
            publishedBy: updatedBy,
            updatedAt: Timestamp.now(),
          });
        }
      }

      await batch.commit();
    }

    await moduleRef.set(module.toObject(), { merge: true });

    return res.status(200).json({
      message: "Módulo atualizado com sucesso",
      module: module.toObject(),
    });
  } catch (err) {
    console.error("Erro ao atualizar módulo:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao atualizar módulo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doc = await db.collection(MODULES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Módulo não encontrado",
      });
    }

    await db.recursiveDelete(db.collection(MODULES_COLLECTION).doc(id));

    return res.status(200).json({ message: "Módulo excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir módulo:", err);
    return res.status(500).json({
      message: "Erro ao excluir módulo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
