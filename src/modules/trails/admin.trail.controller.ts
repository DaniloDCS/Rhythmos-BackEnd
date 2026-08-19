import { Request, Response } from "express";

import { Timestamp } from "firebase-admin/firestore";

import { Trail } from "./trail.model";

import { IModule, Module } from "../learning-modules/module.model";

import { ILesson, ILesson2, ILessonVersion2 } from "../lessons/lesson.model";

import { FieldPath } from "firebase-admin/firestore";

import { db } from "../../config/firebase";

import { recordTrailAudit } from "../audit/admin-audit.service";

import {
  timestampToMillis,
  trailAnalyticsService,
} from "./trail.analytics.service";

type TrailEnrollmentStats = {
  enrollmentsTotal: number;
  enrollmentsActive: number;
  completedUsers: Set<string>;
  cancelledEnrollments: number;
  activeProgressTotal: number;
  activeProgressCount: number;
  inactiveUsers: Set<string>;
};

const normalizeToArray = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }

  return [String(value)];
};

export const getModulesByTrail = async (req: Request, res: Response) => {
  try {
    const { trailId } = req.params;

    if (!trailId)
      return res.status(500).json({
        message:
          "Erro ao buscar módulos da trilha, pois o `id` não foi repassado! ",
        error: "INTERNAL_SERVER_ERROR",
      });

    const includeRestricted =
      String(req.query.includeRestricted ?? "false") === "true";

    let query = db.collection("modules").where("trailId", "==", trailId);

    const snapshot = await query.get();

    let modules = snapshot.docs.map((doc) =>
      Module.fromFirestore(doc.id, doc.data()),
    );

    if (!includeRestricted) {
      modules = modules.filter((module) => module.status == "disponivel");
    }

    return res.status(200).json(modules);
  } catch (err) {
    console.error("Erro ao buscar módulos da trilha:", err);
    return res.status(500).json({
      message: "Erro ao buscar módulos da trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const createTrail = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      status,
      enrollmentPolicy,
      enrolledAccessPolicy,
      prerequisiteTrailIds,
      order,
      level,
      category,
      tags,
      thumbnailUrl,
      featured,
      workloadHours,
      estimatedMinutes,
      createdBy,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "title e description são obrigatórios",
      });
    }

    const trailRef = db.collection("trails").doc();
    const trailId = trailRef.id;

    const trail = new Trail({
      id: trailId,
      title,
      description,
      status: status ?? "rascunho",
      enrollmentPolicy: enrollmentPolicy ?? "open",
      enrolledAccessPolicy: enrolledAccessPolicy ?? "continue",
      prerequisiteTrailIds: prerequisiteTrailIds,
      order: order ?? 0,
      level: level ?? "basico",
      category,
      tags: tags,
      thumbnailUrl,
      totalModules: 0,
      totalLessons: 0,
      featured: featured ?? false,
      workloadHours: workloadHours ?? 0,
      estimatedMinutes: estimatedMinutes ?? 0,
      createdBy,
      updatedBy: createdBy,
      responsibleInstructorId: createdBy,
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    trail.validate();

    await trailRef.set(trail.toObject());

    await recordTrailAudit({
      trailId,
      actorId: createdBy ?? null,
      action: "trail_created",
      entityType: "trail",
      entityId: trailId,
      changes: [
        {
          field: "created",
          previous: null,
          current: { title: trail.title, status: trail.status },
        },
      ],
    });

    return res.status(201).json(trail.toObject());
  } catch (err) {
    console.error("Erro ao criar trilha:", err);
    return res.status(500).json({
      message: "Erro ao criar trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllTrailsAdmin = async (_: Request, res: Response) => {
  try {
    const snapshot = await db.collection("trails").get();

    const trails = snapshot.docs.map((doc) =>
      Trail.fromFirestore(doc.id, doc.data()).toObject(),
    );

    return res.status(200).json(trails);
  } catch (err) {
    console.error("Erro ao buscar trilhas:", err);
    return res.status(500).json({
      message: "Erro ao buscar trilhas",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getTrailByIdAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doc = await db.collection("trails").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada",
      });
    }

    const trail = Trail.fromFirestore(doc.id, doc.data()!);

    return res.status(200).json(trail.toObject());
  } catch (err) {
    console.error("Erro ao buscar trilha:", err);
    return res.status(500).json({
      message: "Erro ao buscar trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getCompleteTrailByIdAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const trailDoc = await db.collection("trails").doc(id).get();

    if (!trailDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada",
      });
    }

    const trailData = {
      id: trailDoc.id,
      ...trailDoc.data(),
    };

    const modulesSnapshot = await db
      .collection("modules")
      .where("trailId", "==", id)
      .get();

    const modules = await Promise.all(
      modulesSnapshot.docs.map(async (moduleDoc) => {
        const moduleData = moduleDoc.data();

        const lessonsSnapshot = await db
          .collection("lessons")
          .where("moduleId", "==", moduleDoc.id)
          .get();

        const lessons = await Promise.all(
          lessonsSnapshot.docs.map(async (lessonDoc) => {
            const lesson = {
              id: lessonDoc.id,
              ...lessonDoc.data(),
            } as ILesson2;

            let version: ILessonVersion2 | null = null;

            if (lesson.currentVersionId) {
              const versionDoc = await lessonDoc.ref
                .collection("versions")
                .doc(lesson.currentVersionId)
                .get();

              if (versionDoc.exists) {
                version = {
                  id: versionDoc.id,
                  ...versionDoc.data(),
                } as ILessonVersion2;
              }
            }

            return {
              ...lesson,
              version,
            };
          }),
        );

        return {
          id: moduleDoc.id,
          ...moduleData,
          children: lessons,
          lessonsCount: lessons.length,
        };
      }),
    );

    return res.status(200).json({
      ...trailData,
      modules,
    });
  } catch (err) {
    console.error("Erro ao buscar trilha:", err);

    return res.status(500).json({
      message: "Erro ao buscar trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

const TRAIL_INACTIVITY_DAYS =
  Number(process.env.TRAIL_INACTIVITY_DAYS) > 0
    ? Number(process.env.TRAIL_INACTIVITY_DAYS)
    : 14;

export const getCompleteTrailsAdmin = async (_req: Request, res: Response) => {
  try {
    const [trailsSnapshot, enrollmentsSnapshot] = await Promise.all([
      db.collection("trails").get(),
      db.collection("enrollments").get(),
    ]);

    const allTrailIds = new Set(trailsSnapshot.docs.map((doc) => doc.id));
    const inactivityLimit =
      Date.now() - TRAIL_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

    const statsByTrail = new Map<string, TrailEnrollmentStats>();

    enrollmentsSnapshot.docs.forEach((doc) => {
      const enrollment = doc.data();
      const trailId = String(enrollment.trailId ?? "").trim();
      const userId = String(enrollment.userId ?? "").trim();
      const status = String(enrollment.status ?? "")
        .trim()
        .toLowerCase();

      if (!trailId) return;

      if (!statsByTrail.has(trailId)) {
        statsByTrail.set(trailId, {
          enrollmentsTotal: 0,
          enrollmentsActive: 0,
          completedUsers: new Set<string>(),
          cancelledEnrollments: 0,
          activeProgressTotal: 0,
          activeProgressCount: 0,
          inactiveUsers: new Set<string>(),
        });
      }

      const stats = statsByTrail.get(trailId)!;
      stats.enrollmentsTotal += 1;

      if (status === "matriculado" || status === "em_andamento") {
        stats.enrollmentsActive += 1;
        stats.activeProgressTotal += Number(enrollment.progress ?? 0) || 0;
        stats.activeProgressCount += 1;

        const lastAccess = timestampToMillis(enrollment.lastAccessAt);
        if (userId && (!lastAccess || lastAccess < inactivityLimit)) {
          stats.inactiveUsers.add(userId);
        }
      }

      if (status === "concluido" && userId) {
        stats.completedUsers.add(userId);
      }

      if (status === "cancelado") {
        stats.cancelledEnrollments += 1;
      }
    });

    const trails = await Promise.all(
      trailsSnapshot.docs.map(async (trailDoc) => {
        const trailId = trailDoc.id;
        const trailData = trailDoc.data();

        const modulesSnapshot = await db
          .collection("modules")
          .where("trailId", "==", trailId)
          .orderBy("sequence", "asc")
          .get();

        const modules = await Promise.all(
          modulesSnapshot.docs.map(async (moduleDoc) => {
            const moduleData = moduleDoc.data();

            const lessonsSnapshot = await db
              .collection("lessons")
              .where("moduleId", "==", moduleDoc.id)
              .get();

            const lessons = await Promise.all(
              lessonsSnapshot.docs.map(async (lessonDoc) => {
                const lesson = {
                  id: lessonDoc.id,
                  ...lessonDoc.data(),
                } as ILesson;

                let version: ILessonVersion2 | null = null;

                if (lesson.currentVersionId) {
                  const versionDoc = await lessonDoc.ref
                    .collection("versions")
                    .doc(lesson.currentVersionId)
                    .get();

                  if (versionDoc.exists) {
                    version = {
                      id: versionDoc.id,
                      ...versionDoc.data(),
                    } as ILessonVersion2;
                  }
                }

                return { ...lesson, version };
              }),
            );

            return {
              id: moduleDoc.id,
              ...moduleData,
              lessons,
              lessonsCount: lessons.length,
            };
          }),
        );

        const totalLessons = modules.reduce(
          (total, module) => total + module.lessonsCount,
          0,
        );

        const stats = statsByTrail.get(trailId);
        const enrollmentsTotal = stats?.enrollmentsTotal ?? 0;
        const enrollmentsActive = stats?.enrollmentsActive ?? 0;
        const completedUsers = stats?.completedUsers.size ?? 0;
        const cancelledEnrollments = stats?.cancelledEnrollments ?? 0;
        const averageProgress = stats?.activeProgressCount
          ? Number(
              (stats.activeProgressTotal / stats.activeProgressCount).toFixed(
                1,
              ),
            )
          : 0;
        const inactiveUsers = stats?.inactiveUsers.size ?? 0;
        const completionRate = enrollmentsTotal
          ? Number(((completedUsers / enrollmentsTotal) * 100).toFixed(1))
          : 0;

        const modulesWithoutLessons = modules.filter(
          (module) => module.lessonsCount === 0,
        ).length;

        const lessonsWithoutPublishedVersion = modules
          .flatMap((module) => module.lessons)
          .filter((lesson: any) => {
            const lessonStatus = String(lesson.status ?? "").toLowerCase();
            const versionStatus = String(
              lesson.version?.status ?? "",
            ).toLowerCase();
            return (
              !lesson.currentVersionId ||
              !lesson.version ||
              lessonStatus !== "disponivel" ||
              !["publicado", "publicada", "disponivel"].includes(versionStatus)
            );
          }).length;

        const invalidPrerequisites = (
          trailData.prerequisiteTrailIds ?? []
        ).filter((id: string) => !allTrailIds.has(String(id))).length;

        let baseProblems = 0;
        if (!String(trailData.title ?? "").trim()) baseProblems += 1;
        if (!String(trailData.description ?? "").trim()) baseProblems += 1;
        if (!String(trailData.status ?? "").trim()) baseProblems += 1;
        if (!String(trailData.level ?? "").trim()) baseProblems += 1;
        if (!modules.length) baseProblems += 1;

        const problems =
          baseProblems +
          modulesWithoutLessons +
          lessonsWithoutPublishedVersion +
          invalidPrerequisites;

        const checks = Math.max(
          5,
          5 +
            modules.length +
            totalLessons +
            (trailData.prerequisiteTrailIds?.length ?? 0),
        );

        const healthScore = Math.max(
          0,
          Math.min(100, Math.round(100 - (problems / checks) * 100)),
        );

        return {
          id: trailId,
          ...trailData,
          modules,
          totalModules: modules.length,
          totalLessons,
          adminStats: {
            enrollmentsTotal,
            enrollmentsActive,
            completedUsers,
            cancelledEnrollments,
            completionRate,
            averageProgress,
            inactiveUsers,
            healthScore,
          },
        };
      }),
    );

    return res.status(200).json(trails);
  } catch (error) {
    console.error("Erro ao buscar trilhas:", error);
    return res.status(500).json({
      message: "Erro ao buscar trilhas",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getTrailAnalyticsAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const analytics = await trailAnalyticsService.getAnalytics(id);
    return res.status(200).json(analytics);
  } catch (err) {
    console.error("Erro ao montar analytics da trilha:", err);

    const status =
      err instanceof Error &&
      "status" in err &&
      typeof (err as Error & { status?: unknown }).status === "number"
        ? Number((err as Error & { status: number }).status)
        : 500;

    return res.status(status).json({
      message: err instanceof Error ? err.message : "Erro ao montar analytics.",
    });
  }
};

export const updateTrailAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { updatedBy } = req.body;

    const trailRef = db.collection("trails").doc(id);

    const doc = await trailRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada",
      });
    }

    const trail = Trail.fromFirestore(doc.id, doc.data()!);

    const before = trail.toObject();

    const dataToUpdate = Object.fromEntries(
      Object.entries({
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        enrollmentPolicy: req.body.enrollmentPolicy,
        enrolledAccessPolicy: req.body.enrolledAccessPolicy,
        prerequisiteTrailIds: req.body.prerequisiteTrailIds,
        order: req.body.order,
        level: req.body.level,
        category: req.body.category,
        tags: req.body.tags,
        thumbnailUrl: req.body.thumbnailUrl,
        featured: req.body.featured,
        workloadHours: req.body.workloadHours,
        estimatedMinutes: req.body.estimatedMinutes,
      }).filter(([, value]) => value !== undefined),
    );

    trail.update(dataToUpdate);

    if (updatedBy) {
      trail.updatedBy = String(updatedBy);
    }

    const after = trail.toObject();

    await trailRef.set(
      {
        ...after,
        ...(updatedBy
          ? {
              updatedBy,
            }
          : {}),
      },

      {
        merge: true,
      },
    );

    const changes = Object.keys(dataToUpdate)
      .filter((field) => {
        const previous = before[field as keyof typeof before];

        const current = after[field as keyof typeof after];

        return JSON.stringify(previous) !== JSON.stringify(current);
      })

      .map((field) => ({
        field,
        previous: before[field as keyof typeof before],
        current: after[field as keyof typeof after],
      }));

    let auditAction:
      | "trail_updated"
      | "trail_published"
      | "trail_unpublished"
      | "trail_status_changed" = "trail_updated";

    const statusChanged = before.status !== after.status;

    if (statusChanged) {
      if (after.status === "disponivel") {
        auditAction = "trail_published";
      } else if (before.status === "disponivel") {
        auditAction = "trail_unpublished";
      } else {
        auditAction = "trail_status_changed";
      }
    }

    if (changes.length > 0) {
      await recordTrailAudit({
        trailId: id,
        actorId: updatedBy ?? null,
        action: auditAction,
        entityType: "trail",
        entityId: id,
        changes,
      });
    }

    return res.status(200).json({
      message: "Trilha atualizada com sucesso",

      trail: after,
    });
  } catch (err) {
    console.error("Erro ao atualizar trilha:", err);

    return res.status(500).json({
      message: "Erro ao atualizar trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const simpleUpdateTrailAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const trailRef = db.collection("trails").doc(id);
    const doc = await trailRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada",
      });
    }

    const trail = Trail.fromFirestore(doc.id, doc.data()!);
    const before = trail.toObject();

    const allowedFields = [
      "title",
      "description",
      "status",
      "prerequisiteTrailIds",
      "order",
      "level",
      "category",
      "tags",
      "thumbnailUrl",
      "featured",
      "workloadHours",
      "estimatedMinutes",
    ] as const;

    const patch: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }

    trail.update(patch);
    if (updatedBy) trail.updatedBy = String(updatedBy);
    const after = trail.toObject();

    await trailRef.set(after, { merge: true });

    const changes = Object.keys(patch)
      .filter(
        (field) =>
          JSON.stringify(before[field as keyof typeof before]) !==
          JSON.stringify(after[field as keyof typeof after]),
      )
      .map((field) => ({
        field,
        previous: before[field as keyof typeof before],
        current: after[field as keyof typeof after],
      }));

    if (changes.length) {
      let action:
        | "trail_updated"
        | "trail_published"
        | "trail_unpublished"
        | "trail_status_changed" = "trail_updated";

      if (before.status !== after.status) {
        if (after.status === "disponivel") action = "trail_published";
        else if (before.status === "disponivel") action = "trail_unpublished";
        else action = "trail_status_changed";
      }

      await recordTrailAudit({
        trailId: id,
        actorId: updatedBy ?? null,
        action,
        entityType: "trail",
        entityId: id,
        changes,
      });
    }

    return res.status(200).json({
      message: "Trilha atualizada com sucesso",
      trail: after,
    });
  } catch (err) {
    console.error("Erro ao atualizar trilha:", err);
    return res.status(500).json({
      message: "Erro ao atualizar trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const publishTrailAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedBy = req.body?.updatedBy ?? null;

    const trailRef = db.collection("trails").doc(id);
    const trailDoc = await trailRef.get();

    if (!trailDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada",
      });
    }

    const modulesSnapshot = await db
      .collection("modules")
      .where("trailId", "==", id)
      .get();

    if (modulesSnapshot.empty) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message:
          "A trilha deve possuir pelo menos um módulo para ser publicada.",
      });
    }

    const moduleIds = modulesSnapshot.docs.map((doc) => doc.id);
    const lessonsByModule = await Promise.all(
      moduleIds.map((moduleId) =>
        db
          .collection("lessons")
          .where("moduleId", "==", moduleId)
          .limit(1)
          .get(),
      ),
    );

    if (!lessonsByModule.some((snapshot) => !snapshot.empty)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message:
          "A trilha deve possuir pelo menos uma aula para ser publicada.",
      });
    }

    const trail = Trail.fromFirestore(trailDoc.id, trailDoc.data()!);
    const before = trail.toObject();

    trail.publish();
    if (updatedBy) trail.updatedBy = String(updatedBy);
    const after = trail.toObject();

    await trailRef.set(after, { merge: true });

    await recordTrailAudit({
      trailId: id,
      actorId: updatedBy,
      action: "trail_published",
      entityType: "trail",
      entityId: id,
      changes: [
        {
          field: "status",
          previous: before.status,
          current: after.status,
        },
      ],
    });

    return res.status(200).json({
      message: "Trilha publicada com sucesso",
      trail: after,
    });
  } catch (err) {
    console.error("Erro ao publicar trilha:", err);
    return res.status(500).json({
      message: "Erro ao publicar trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteTrailAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trailRef = db.collection("trails").doc(id);
    const trailDoc = await trailRef.get();

    if (!trailDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Trilha não encontrada",
      });
    }

    const modulesSnapshot = await db
      .collection("modules")
      .where("trailId", "==", id)
      .get();

    for (const moduleDoc of modulesSnapshot.docs) {
      const lessonsSnapshot = await db
        .collection("lessons")
        .where("moduleId", "==", moduleDoc.id)
        .get();

      const lessonDeletes = lessonsSnapshot.docs.map((lesson) =>
        lesson.ref.delete(),
      );

      await Promise.all(lessonDeletes);

      await moduleDoc.ref.delete();
    }

    await recordTrailAudit({
      trailId: id,
      actorId: req.body?.updatedBy ?? null,
      action: "trail_deleted",
      entityType: "trail",
      entityId: id,
      changes: [
        {
          field: "deleted",
          previous: trailDoc.data(),
          current: null,
        },
      ],
    });

    await trailRef.delete();

    return res.status(200).json({
      message: "Trilha, módulos e aulas excluídos com sucesso",
    });
  } catch (err) {
    console.error("Erro ao excluir trilha:", err);

    return res.status(500).json({
      message: "Erro ao excluir trilha",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
