import { Request, Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { IEnrollment } from "./enrollment.types";
import { db } from "../../config/firebase";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { ILesson } from "../lessons/lesson.model";
import { IModule } from "../learning-modules/module.model";
import { ITrail } from "../trails/trail.model";
import { AcademicIndicesService } from "./academic-indices.service";

const ENROLLMENTS_COLLECTION = "enrollments";
const TRAILS_COLLECTION = "trails";
const MODULES_COLLECTION = "modules";
const LESSONS_COLLECTION = "lessons";

export const registerEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { trailId } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    if (!trailId || typeof trailId !== "string") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "trailId é obrigatório.",
      });
    }

    const enrollmentSnap = await db
      .collection(ENROLLMENTS_COLLECTION)
      .where("userId", "==", userId)
      .where("trailId", "==", trailId)
      .limit(1)
      .get();

    if (!enrollmentSnap.empty) {
      const enrollmentDoc = enrollmentSnap.docs[0];

      return res.status(409).json({
        error: "CONFLICT",
        message: "Usuário já matriculado nesta trilha.",
        enrollment: {
          ...enrollmentDoc.data(),
          id: enrollmentDoc.id,
        },
      });
    }

    const trailRef = db.collection(TRAILS_COLLECTION).doc(trailId);

    const trailDoc = await trailRef.get();

    if (!trailDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada.",
      });
    }

    const trail = trailDoc.data() as ITrail;

    if (trail.status !== "disponivel") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Esta trilha não está disponível para matrícula.",
      });
    }

    if (trail.enrollmentPolicy === "closed") {
      return res.status(403).json({
        error: "ENROLLMENTS_CLOSED",
        message: "As novas matrículas desta trilha estão temporariamente pausadas.",
      });
    }

    const prerequisiteTrailIds = trail.prerequisiteTrailIds ?? [];

    if (prerequisiteTrailIds.length > 0) {
      const prerequisiteEnrollmentsSnap = await db
        .collection(ENROLLMENTS_COLLECTION)
        .where("userId", "==", userId)
        .where("trailId", "in", prerequisiteTrailIds.slice(0, 10))
        .get();

      const completedPrerequisiteIds = new Set(
        prerequisiteEnrollmentsSnap.docs
          .filter((doc) => doc.data().status === "concluido")
          .map((doc) => doc.data().trailId as string),
      );

      const missingPrerequisiteIds = prerequisiteTrailIds.filter(
        (prerequisiteId) => !completedPrerequisiteIds.has(prerequisiteId),
      );

      if (missingPrerequisiteIds.length > 0) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "Conclua os pré-requisitos antes de realizar a matrícula.",
          prerequisiteTrailIds: missingPrerequisiteIds,
        });
      }
    }

    const modulesSnap = await db
      .collection(MODULES_COLLECTION)
      .where("trailId", "==", trailId)
      .where("status", "==", "disponivel")
      .orderBy("sequence", "asc")
      .limit(1)
      .get();

    if (modulesSnap.empty) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "A trilha não possui módulos disponíveis.",
      });
    }

    const firstModuleDoc = modulesSnap.docs[0];
    const currentModuleId = firstModuleDoc.id;

    const lessonsSnap = await db
      .collection(LESSONS_COLLECTION)
      .where("moduleId", "==", currentModuleId)
      .where("status", "==", "disponivel")
      .orderBy("sequence", "asc")
      .limit(1)
      .get();

    if (lessonsSnap.empty) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "O primeiro módulo da trilha não possui aulas disponíveis.",
      });
    }

    const currentLessonId = lessonsSnap.docs[0].id;
    const now = Timestamp.now();

    const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc();

    const enrollment: IEnrollment = {
      id: enrollmentRef.id,

      userId,
      trailId,

      status: "matriculado",
      progress: 0,

      currentModuleId,
      currentLessonId,

      completedModules: 0,
      completedLessons: 0,
      completedAssessments: 0,

      xp: 0,

      startedAt: now,
      lastAccessAt: now,

      completedModulesMap: {},
      completedLessonsMap: {},
      completedAssessmentsMap: {},
    };

    await enrollmentRef.set(enrollment);

    return res.status(201).json({
      message: "Matrícula criada com sucesso.",
      enrollment,
    });
  } catch (err) {
    console.error("Erro ao criar matrícula:", err);

    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: err instanceof Error ? err.message : "Erro ao criar matrícula.",
    });
  }
};

export const getEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (!req.user) return;

    const userId = req.user.uid;

    if (!userId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório",
      });
    }

    const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc(id);
    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Matrícula não encontrada.",
      });
    }

    const enrollment = enrollmentDoc.data() as IEnrollment;

    if (enrollment.userId !== userId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Você não tem permissão para acessar esta matrícula.",
      });
    }

    const [trailDoc, moduleDoc] = await Promise.all([
      db.collection(TRAILS_COLLECTION).doc(enrollment.trailId).get(),
      enrollment.currentModuleId
        ? db.collection(MODULES_COLLECTION).doc(enrollment.currentModuleId).get()
        : Promise.resolve(null),
    ]);

    const trailData = trailDoc.exists ? trailDoc.data() : undefined;
    const moduleData = moduleDoc?.exists ? moduleDoc.data() : undefined;

    if (trailData?.enrolledAccessPolicy === "paused") {
      return res.status(403).json({
        error: "ENROLLED_ACCESS_PAUSED",
        message: "O acesso dos alunos matriculados nesta trilha está temporariamente suspenso.",
      });
    }

    const academicIndices = await AcademicIndicesService.calculate({ ...enrollment, id: enrollmentDoc.id });
    return res.status(200).json({
      ...enrollment,
      academicIndices,

      progress: Number(enrollment.progress ?? 0),
      completedAssessments: Number(enrollment.completedAssessments ?? 0),
      completedAssessmentsMap: enrollment.completedAssessmentsMap ?? {},
      trail: trailData
        ? {
            id: trailDoc.id,
            title: trailData.title,
            description: trailData.description ?? null,
            thumbnailUrl: trailData.thumbnailUrl ?? null,
            status: trailData.status ?? null,
            enrollmentPolicy: trailData.enrollmentPolicy ?? "open",
            enrolledAccessPolicy: trailData.enrolledAccessPolicy ?? "continue",
          }
        : null,
      currentModule: moduleData
        ? {
            id: moduleDoc!.id,
            title: moduleData.title,
            sequence: moduleData.sequence ?? null,
          }
        : null,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Erro ao buscar matrícula.",
    });
  }
};

export const patchEnrollment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, ...data } = req.body;

    if (!id) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Id da matrícula é obrigatório.",
      });
    }

    if (!userId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Uid é obrigatório.",
      });
    }

    const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc(id);

    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Matrícula não encontrada.",
      });
    }

    const enrollment = enrollmentDoc.data();

    if (enrollment?.userId !== userId) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Você não possui permissão para alterar esta matrícula.",
      });
    }

    const updatedEnrollment = {
      ...data,
      lastAccessAt: Timestamp.now(),
    };

    await enrollmentRef.set(updatedEnrollment, {
      merge: true,
    });

    const updatedDoc = await enrollmentRef.get();

    return res.status(200).json({
      message: "Matrícula atualizada com sucesso.",
      enrollment: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Erro ao atualizar matrícula.",
    });
  }
};

export const getMyEnrollments = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) return;

    const id = req.user.uid;

    if (!id) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório",
      });
    }

    const snapshot = await db
      .collection(ENROLLMENTS_COLLECTION)
      .where("userId", "==", id)
      .get();

    const enrollmentRecords = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (IEnrollment & { id: string })[];

    const trailIds = [...new Set(enrollmentRecords.map((item) => item.trailId).filter(Boolean))];
    const trailSnapshots = trailIds.length
      ? await db.getAll(...trailIds.map((trailId) => db.collection(TRAILS_COLLECTION).doc(trailId)))
      : [];
    const trailsById = new Map<string, Record<string, unknown>>(
      trailSnapshots
        .filter((trailDoc) => trailDoc.exists)
        .map((trailDoc) => [trailDoc.id, { id: trailDoc.id, ...(trailDoc.data() as Record<string, unknown>) }]),
    );
    const enrollments = await Promise.all(enrollmentRecords.map(async (enrollment) => ({
      ...enrollment,
      academicIndices: await AcademicIndicesService.calculate(enrollment),
      trail: trailsById.get(enrollment.trailId) ?? null,
      accessPaused: trailsById.get(enrollment.trailId)?.enrolledAccessPolicy === "paused",
    })));

    return res.status(200).json(enrollments);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Erro ao buscar matrículas.",
    });
  }
};

type EnrollmentControllerError = Error & {
  status: number;
};

const createEnrollmentError = (
  status: number,
  message: string,
): EnrollmentControllerError => {
  return Object.assign(new Error(message), { status });
};

interface CompleteLessonResult {
  enrollment: IEnrollment;
  nextLessonId: string | null;
}

export const completeLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const enrollmentId = req.params.id;
    const lessonId = req.body?.lessonId;

    console.log({ req: req.user });
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    if (typeof enrollmentId !== "string" || enrollmentId.trim() === "") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "O ID da matrícula é obrigatório.",
      });
    }

    if (typeof lessonId !== "string" || lessonId.trim() === "") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "O ID da aula é obrigatório.",
      });
    }

    const enrollmentRef = db
      .collection(ENROLLMENTS_COLLECTION)
      .doc(enrollmentId);

    const result = await db.runTransaction<CompleteLessonResult>(async (tx) => {
      const enrollmentDoc = await tx.get(enrollmentRef);

      if (!enrollmentDoc.exists) {
        throw createEnrollmentError(404, "Matrícula não encontrada.");
      }

      const enrollment: IEnrollment = {
        ...(enrollmentDoc.data() as Omit<IEnrollment, "id">),
        id: enrollmentDoc.id,
      };

      if (enrollment.userId !== userId) {
        throw createEnrollmentError(
          403,
          "Você não possui permissão para alterar esta matrícula.",
        );
      }

      if (enrollment.status === "cancelado") {
        throw createEnrollmentError(
          400,
          "Não é possível concluir aulas de uma matrícula cancelada.",
        );
      }

      if (enrollment.status === "concluido") {
        throw createEnrollmentError(400, "Esta matrícula já foi concluída.");
      }

      const lessonRef = db.collection(LESSONS_COLLECTION).doc(lessonId);

      const lessonDoc = await tx.get(lessonRef);

      if (!lessonDoc.exists) {
        throw createEnrollmentError(404, "Aula não encontrada.");
      }

      const lesson: ILesson & { id: string } = {
        ...(lessonDoc.data() as Omit<ILesson, "id">),
        id: lessonDoc.id,
      };

      const moduleRef = db.collection(MODULES_COLLECTION).doc(lesson.moduleId);

      const moduleDoc = await tx.get(moduleRef);

      if (!moduleDoc.exists) {
        throw createEnrollmentError(404, "Módulo da aula não encontrado.");
      }

      const currentModule: IModule & { id: string } = {
        ...(moduleDoc.data() as Omit<IModule, "id">),
        id: moduleDoc.id,
      };

      if (currentModule.trailId !== enrollment.trailId) {
        throw createEnrollmentError(
          400,
          "A aula não pertence à trilha desta matrícula.",
        );
      }

      const modulesQuery = db
        .collection(MODULES_COLLECTION)
        .where("trailId", "==", enrollment.trailId)
        .where("status", "==", "disponivel")
        .orderBy("sequence", "asc");

      const modulesSnap = await tx.get(modulesQuery);

      const modules: Array<IModule & { id: string }> = modulesSnap.docs.map(
        (doc) => ({
          ...(doc.data() as Omit<IModule, "id">),
          id: doc.id,
        }),
      );

      if (modules.length === 0) {
        throw createEnrollmentError(
          400,
          "A trilha não possui módulos disponíveis.",
        );
      }

      const currentModuleIndex = modules.findIndex(
        (moduleItem) => moduleItem.id === currentModule.id,
      );

      if (currentModuleIndex === -1) {
        throw createEnrollmentError(
          400,
          "O módulo da aula não está disponível nesta trilha.",
        );
      }

      const lessonsByModule = new Map<
        string,
        Array<ILesson & { id: string }>
      >();

      for (const moduleItem of modules) {
        const lessonsQuery = db
          .collection(LESSONS_COLLECTION)
          .where("moduleId", "==", moduleItem.id)
          .where("status", "==", "disponivel")
          .orderBy("sequence", "asc");

        const lessonsSnap = await tx.get(lessonsQuery);

        const moduleLessons: Array<ILesson & { id: string }> =
          lessonsSnap.docs.map((doc) => ({
            ...(doc.data() as Omit<ILesson, "id">),
            id: doc.id,
          }));

        lessonsByModule.set(moduleItem.id, moduleLessons);
      }

      const currentModuleLessons = lessonsByModule.get(currentModule.id) ?? [];

      if (currentModuleLessons.length === 0) {
        throw createEnrollmentError(
          400,
          "O módulo não possui aulas disponíveis.",
        );
      }

      const currentLessonIndex = currentModuleLessons.findIndex(
        (lessonItem) => lessonItem.id === lessonId,
      );

      if (currentLessonIndex === -1) {
        throw createEnrollmentError(
          400,
          "A aula não está disponível no módulo informado.",
        );
      }

      const completedLessonsMap: Record<string, true> = {
        ...(enrollment.completedLessonsMap ?? {}),
      };

      completedLessonsMap[lessonId] = true;

      const completedModulesMap: Record<string, true> = {
        ...(enrollment.completedModulesMap ?? {}),
      };

      for (const moduleItem of modules) {
        const moduleLessons = lessonsByModule.get(moduleItem.id) ?? [];

        const moduleCompleted =
          moduleLessons.length > 0 &&
          moduleLessons.every(
            (lessonItem) => completedLessonsMap[lessonItem.id] === true,
          );

        if (moduleCompleted) {
          completedModulesMap[moduleItem.id] = true;
        } else {
          delete completedModulesMap[moduleItem.id];
        }
      }

      const allLessons = modules.flatMap(
        (moduleItem) => lessonsByModule.get(moduleItem.id) ?? [],
      );

      const completedLessons = allLessons.filter(
        (lessonItem) => completedLessonsMap[lessonItem.id] === true,
      ).length;

      const completedModules = modules.filter(
        (moduleItem) => completedModulesMap[moduleItem.id] === true,
      ).length;

      const totalLessons = allLessons.length;

      const progress =
        totalLessons === 0
          ? 0
          : Math.min(100, Math.round((completedLessons / totalLessons) * 100));

      let nextPosition: {
        moduleId: string;
        lessonId: string;
      } | null = null;

      for (
        let index = currentLessonIndex + 1;
        index < currentModuleLessons.length;
        index++
      ) {
        const nextLesson = currentModuleLessons[index];

        if (!completedLessonsMap[nextLesson.id]) {
          nextPosition = {
            moduleId: currentModule.id,
            lessonId: nextLesson.id,
          };

          break;
        }
      }

      if (!nextPosition) {
        for (
          let moduleIndex = currentModuleIndex + 1;
          moduleIndex < modules.length;
          moduleIndex++
        ) {
          const nextModule = modules[moduleIndex];
          const nextModuleLessons = lessonsByModule.get(nextModule.id) ?? [];

          const nextLesson = nextModuleLessons.find(
            (lessonItem) => !completedLessonsMap[lessonItem.id],
          );

          if (nextLesson) {
            nextPosition = {
              moduleId: nextModule.id,
              lessonId: nextLesson.id,
            };

            break;
          }
        }
      }

      if (!nextPosition) {
        for (const moduleItem of modules) {
          const moduleLessons = lessonsByModule.get(moduleItem.id) ?? [];

          const pendingLesson = moduleLessons.find(
            (lessonItem) => !completedLessonsMap[lessonItem.id],
          );

          if (pendingLesson) {
            nextPosition = {
              moduleId: moduleItem.id,
              lessonId: pendingLesson.id,
            };

            break;
          }
        }
      }

      const now = Timestamp.now();

      if (!nextPosition) {
        tx.update(enrollmentRef, {
          status: "concluido",
          progress: 100,
          completedLessons,
          completedModules,
          completedLessonsMap,
          completedModulesMap,
          currentModuleId: FieldValue.delete(),
          currentLessonId: FieldValue.delete(),
          completedAt: now,
          lastAccessAt: now,
        });

        const {
          currentModuleId: _currentModuleId,
          currentLessonId: _currentLessonId,
          ...enrollmentWithoutCurrentPosition
        } = enrollment;

        const completedEnrollment: IEnrollment = {
          ...enrollmentWithoutCurrentPosition,
          status: "concluido",
          progress: 100,
          completedLessons,
          completedModules,
          completedLessonsMap,
          completedModulesMap,
          completedAt: now,
          lastAccessAt: now,
        };

        return {
          enrollment: completedEnrollment,
          nextLessonId: null,
        };
      }

      tx.update(enrollmentRef, {
        status: "matriculado",
        progress,
        completedLessons,
        completedModules,
        completedLessonsMap,
        completedModulesMap,
        currentModuleId: nextPosition.moduleId,
        currentLessonId: nextPosition.lessonId,
        lastAccessAt: now,
      });

      const activeEnrollment: IEnrollment = {
        ...enrollment,
        status: "matriculado",
        progress,
        completedLessons,
        completedModules,
        completedLessonsMap,
        completedModulesMap,
        currentModuleId: nextPosition.moduleId,
        currentLessonId: nextPosition.lessonId,
        lastAccessAt: now,
      };

      return {
        enrollment: activeEnrollment,
        nextLessonId: nextPosition.lessonId,
      };
    });

    const updatedEnrollment = result.enrollment;

    type LessonWithCurrentVersion = Omit<ILesson, "version"> & {
      id: string;
      version?: Record<string, unknown>;
    };

    let nextLesson: LessonWithCurrentVersion | null = null;

    if (result.nextLessonId) {
      const nextLessonRef = db
        .collection(LESSONS_COLLECTION)
        .doc(result.nextLessonId);

      const nextLessonDoc = await nextLessonRef.get();

      if (nextLessonDoc.exists) {
        const nextLessonData = nextLessonDoc.data() as ILesson;

        let version: Record<string, unknown> | undefined;

        if (nextLessonData.currentVersionId) {
          const versionDoc = await nextLessonRef
            .collection("versions")
            .doc(nextLessonData.currentVersionId)
            .get();

          if (versionDoc.exists) {
            version = {
              ...versionDoc.data(),
              id: versionDoc.id,
            };
          }
        }

        nextLesson = {
          ...nextLessonData,
          id: nextLessonDoc.id,
          version,
        };
      }
    }

    return res.status(200).json({
      message:
        updatedEnrollment.status === "concluido"
          ? "Trilha concluída com sucesso."
          : "Aula concluída com sucesso.",

      enrollment: updatedEnrollment,
      nextLesson,
    });
  } catch (err) {
    console.error("Erro ao concluir aula:", err);

    const status =
      err instanceof Error &&
      "status" in err &&
      typeof (err as EnrollmentControllerError).status === "number"
        ? (err as EnrollmentControllerError).status
        : 500;

    return res.status(status).json({
      message: err instanceof Error ? err.message : "Erro ao concluir aula.",
    });
  }
};
