// import { Request, Response } from "express";
// import { FieldValue, Timestamp } from "firebase-admin/firestore";
// import { Module } from "../models/Module";
// import { Lesson } from "../models/Lesson";
// import { db } from "./../config/firebase";

// const MODULES_COLLECTION = "modules";
// const USER_MODULE_PROGRESS_COLLECTION = "userModuleProgress";

// const normalizeStringArray = (value: unknown): string[] => {
//   if (!Array.isArray(value)) return [];
//   return value
//     .filter((item): item is string => typeof item === "string")
//     .map((item) => item.trim())
//     .filter(Boolean);
// };

// const parseBoolean = (value: unknown, fallback = false): boolean => {
//   if (typeof value === "boolean") return value;
//   return fallback;
// };

// // Usuário

// export const getPublishedModules = async (_: Request, res: Response) => {
//   try {
//     const snapshot = await db
//       .collection(MODULES_COLLECTION)
//       .where("published", "==", true)
//       .where("archived", "==", false)
//       .orderBy("sequence", "asc")
//       .get();

//     const modules = snapshot.docs.map((doc) =>
//       Module.fromFirestore(doc.id, doc.data()).toObject(),
//     );

//     return res.status(200).json(modules);
//   } catch (err) {
//     console.error("Erro ao buscar módulos publicados:", err);
//     return res.status(500).json({ error: "Erro ao buscar módulos publicados" });
//   }
// };

// export const getModulesByTrail = async (req: Request, res: Response) => {
//   try {
//     const { trailId } = req.params;
//     const includeRestricted =
//       String(req.query.includeRestricted ?? "false") === "true";

//     let query = db
//       .collection(MODULES_COLLECTION)
//       .where("trailId", "==", trailId);

//     const snapshot = await query.get();

//     let modules = snapshot.docs.map((doc) =>
//       Module.fromFirestore(doc.id, doc.data()),
//     );

//     return res.status(200).json(modules);
//   } catch (err) {
//     console.error("Erro ao buscar módulos da trilha:", err);
//     return res.status(500).json({ error: "Erro ao buscar módulos da trilha" });
//   }
// };

// export const getLessonsByModule = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     let query = db.collection("lessons").where("moduleId", "==", id);

//     const snapshot = await query.get();

//     let lesssons = snapshot.docs.map((doc) =>
//       Lesson.fromFirestore(doc.id, doc.data()),
//     );

//     return res.status(200).json(lesssons);
//   } catch (err) {
//     console.error("Erro ao buscar aulas do módulo:", err);
//     return res.status(500).json({ error: "Erro ao buscar aulas do módulo" });
//   }
// };

// export const getAccessibleModulesByTrail = async (
//   req: Request,
//   res: Response,
// ) => {
//   try {
//     const { trailId } = req.params;
//     const userId = String(req.query.userId ?? "");

//     if (!userId) {
//       return res.status(400).json({ message: "userId é obrigatório" });
//     }

//     const [modulesSnap, progressSnap] = await Promise.all([
//       db
//         .collection(MODULES_COLLECTION)
//         .where("trailId", "==", trailId)
//         .orderBy("sequence", "asc")
//         .get(),
//       db
//         .collection(USER_MODULE_PROGRESS_COLLECTION)
//         .where("userId", "==", userId)
//         .where("status", "==", "Concluída")
//         .get(),
//     ]);

//     const allModules = modulesSnap.docs.map((doc) =>
//       Module.fromFirestore(doc.id, doc.data()),
//     );

//     const completedModuleIds = progressSnap.docs.map((doc) =>
//       String(doc.data().moduleId ?? ""),
//     );

//     const accessibleModules = allModules
//       .filter(
//         (module) =>
//           module.published &&
//           !module.archived &&
//           module.visibility !== "privada" &&
//           module.canUserAccess(completedModuleIds, allModules),
//       )
//       .map((module) => module.toObject());

//     return res.status(200).json(accessibleModules);
//   } catch (err) {
//     console.error("Erro ao buscar módulos acessíveis da trilha:", err);
//     return res
//       .status(500)
//       .json({ error: "Erro ao buscar módulos acessíveis da trilha" });
//   }
// };

// export const getModuleById = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const userId = String(req.query.userId ?? "");
//     const isAdminView = String(req.query.admin ?? "false") === "true";

//     const doc = await db.collection(MODULES_COLLECTION).doc(id).get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Módulo não encontrado" });
//     }

//     const module = Module.fromFirestore(doc.id, doc.data()!);

//     if (!isAdminView) {
//       if (
//         !module.published ||
//         module.archived ||
//         module.visibility === "privada"
//       ) {
//         return res.status(403).json({ message: "Módulo indisponível" });
//       }

//       if (userId) {
//         const [progressSnap, trailModulesSnap] = await Promise.all([
//           db
//             .collection(USER_MODULE_PROGRESS_COLLECTION)
//             .where("userId", "==", userId)
//             .where("status", "==", "Concluída")
//             .get(),
//           db
//             .collection(MODULES_COLLECTION)
//             .where("trailId", "==", module.trailId)
//             .orderBy("sequence", "asc")
//             .get(),
//         ]);

//         const completedModuleIds = progressSnap.docs.map((d) =>
//           String(d.data().moduleId ?? ""),
//         );

//         const allModules = trailModulesSnap.docs.map((d) =>
//           Module.fromFirestore(d.id, d.data()),
//         );

//         if (!module.canUserAccess(completedModuleIds, allModules)) {
//           return res
//             .status(403)
//             .json({ message: "Módulo bloqueado por pré-requisitos" });
//         }
//       }

//       module.incrementViews();
//       await db
//         .collection(MODULES_COLLECTION)
//         .doc(id)
//         .set(module.toObject(), { merge: true });
//     }

//     return res.status(200).json(module.toObject());
//   } catch (err) {
//     console.error("Erro ao buscar módulo pelo ID:", err);
//     return res.status(500).json({ error: "Erro ao buscar módulo pelo ID" });
//   }
// };

// export const createModule = async (req: Request, res: Response) => {
//   try {
//     const {
//       trailId,
//       title,
//       shortDescription,
//       description,
//       sequence,
//       status,
//       level,
//       category,
//       tags,
//       published,
//       prerequisiteModuleIds,
//       lessonIds,
//       quizIds,
//       activityIds,
//       totalLessons,
//       totalQuizzes,
//       totalActivities,
//       estimatedMinutes,
//       workloadHours,
//       thumbnailUrl,
//       visibility,
//       featured,
//       createdBy,
//       responsibleInstructorId,
//       changeLog,
//     } = req.body;

//     if (!trailId || !title || !description || sequence === undefined) {
//       return res.status(400).json({
//         message: "trailId, title, description e sequence são obrigatórios",
//       });
//     }

//     const trailRef = db.collection("trails").doc(trailId);
//     const trailDoc = await trailRef.get();

//     if (!trailDoc.exists) {
//       return res.status(404).json({
//         message: "Trilha não encontrada.",
//       });
//     }

//     const moduleRef = db.collection(MODULES_COLLECTION).doc();
//     const moduleId = moduleRef.id;

//     const module = new Module({
//       id: moduleId,
//       trailId,
//       title,
//       shortDescription,
//       description,
//       sequence,
//       status: status ?? "em_construcao",
//       level: level ?? "basico",
//       category,
//       tags: normalizeStringArray(tags),
//       published: published ?? false,
//       prerequisiteModuleIds: normalizeStringArray(prerequisiteModuleIds),
//       lessonIds: normalizeStringArray(lessonIds),
//       quizIds: normalizeStringArray(quizIds),
//       activityIds: normalizeStringArray(activityIds),
//       totalLessons,
//       totalQuizzes,
//       totalActivities,
//       estimatedMinutes,
//       workloadHours,
//       thumbnailUrl,
//       visibility: visibility ?? "privada",
//       featured: parseBoolean(featured, false),
//       createdBy,
//       responsibleInstructorId,
//       changeLog,
//       createdAt: Timestamp.now(),
//     });

//     module.validate();

//     if (published === true) module.publish(createdBy);

//     const batch = db.batch();

//     batch.set(moduleRef, module.toObject());

//     batch.update(trailRef, {
//       totalModules: FieldValue.increment(1),
//       updatedAt: Timestamp.now(),
//       updatedBy: createdBy,
//     });

//     await batch.commit();

//     return res.status(201).json(module.toObject());
//   } catch (err) {
//     console.error("Erro ao criar módulo:", err);

//     return res.status(500).json({
//       error: err instanceof Error ? err.message : "Erro ao criar módulo",
//     });
//   }
// };

// // Administração

// export const getAllModules = async (_: Request, res: Response) => {
//   try {
//     const snapshot = await db
//       .collection(MODULES_COLLECTION)
//       .orderBy("sequence", "asc")
//       .get();

//     const modules = snapshot.docs.map((doc) =>
//       Module.fromFirestore(doc.id, doc.data()).toObject(),
//     );

//     return res.status(200).json(modules);
//   } catch (err) {
//     console.error("Erro ao buscar módulos:", err);
//     return res.status(500).json({ error: "Erro ao buscar módulos" });
//   }
// };

// export const updateModule = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { updatedBy, publishNow } = req.body;

//     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
//     const doc = await moduleRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Módulo não encontrado" });
//     }

//     const module = Module.fromFirestore(doc.id, doc.data()!);

//     module.update(
//       {
//         trailId: req.body.trailId,
//         title: req.body.title,
//         shortDescription: req.body.shortDescription,
//         description: req.body.description,
//         sequence: req.body.sequence,
//         status: req.body.status,
//         level: req.body.level,
//         category: req.body.category,
//         tags: Array.isArray(req.body.tags)
//           ? normalizeStringArray(req.body.tags)
//           : undefined,
//         published: req.body.published,
//         prerequisiteModuleIds: Array.isArray(req.body.prerequisiteModuleIds)
//           ? normalizeStringArray(req.body.prerequisiteModuleIds)
//           : undefined,
//         lessonIds: Array.isArray(req.body.lessonIds)
//           ? normalizeStringArray(req.body.lessonIds)
//           : undefined,
//         quizIds: Array.isArray(req.body.quizIds)
//           ? normalizeStringArray(req.body.quizIds)
//           : undefined,
//         activityIds: Array.isArray(req.body.activityIds)
//           ? normalizeStringArray(req.body.activityIds)
//           : undefined,
//         totalLessons: req.body.totalLessons,
//         totalQuizzes: req.body.totalQuizzes,
//         totalActivities: req.body.totalActivities,
//         estimatedMinutes: req.body.estimatedMinutes,
//         workloadHours: req.body.workloadHours,
//         thumbnailUrl: req.body.thumbnailUrl,
//         visibility: req.body.visibility,
//         featured: req.body.featured,
//         responsibleInstructorId: req.body.responsibleInstructorId,
//         changeLog: req.body.changeLog,
//       },
//       updatedBy,
//     );

//     if (publishNow === true) {
//       module.publish(updatedBy);
//     }

//     if (req.body.status === "disponivel") {
//       const lessonsSnap = await db
//         .collection("lessions")
//         .where("moduleId", "==", id)
//         .get();

//       const batch = db.batch();

//       for (const lessonDoc of lessonsSnap.docs) {
//         const lesson = lessonDoc.data();

//         // Atualiza a aula
//         batch.update(lessonDoc.ref, {
//           status: "disponivel",
//           updatedAt: Timestamp.now(),
//           updatedBy,
//         });

//         // Atualiza a versão atual da aula
//         const versionRef = db
//           .collection("versions")
//           .doc(lesson.currentVersionId);

//         batch.update(versionRef, {
//           status: "publico",
//           publishedAt: Timestamp.now(),
//           publishedBy: updatedBy,
//           updatedAt: Timestamp.now(),
//         });
//       }

//       await batch.commit();
//     }

//     await moduleRef.set(module.toObject(), { merge: true });

//     return res.status(200).json({
//       message: "Módulo atualizado com sucesso",
//       module: module.toObject(),
//     });
//   } catch (err) {
//     console.error("Erro ao atualizar módulo:", err);
//     return res.status(500).json({
//       error: err instanceof Error ? err.message : "Erro ao atualizar módulo",
//     });
//   }
// };

// // export const publishModule = async (req: Request, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const { updatedBy } = req.body;

// //     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
// //     const doc = await moduleRef.get();

// //     if (!doc.exists) {
// //       return res.status(404).json({ message: "Módulo não encontrado" });
// //     }

// //     const module = Module.fromFirestore(doc.id, doc.data()!);
// //     module.publish(updatedBy);

// //     await moduleRef.set(module.toObject(), { merge: true });

// //     return res.status(200).json({
// //       message: "Módulo publicado com sucesso",
// //       module: module.toObject(),
// //     });
// //   } catch (err) {
// //     console.error("Erro ao publicar módulo:", err);
// //     return res.status(500).json({
// //       error: err instanceof Error ? err.message : "Erro ao publicar módulo",
// //     });
// //   }
// // };

// // export const unpublishModule = async (req: Request, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const { updatedBy } = req.body;

// //     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
// //     const doc = await moduleRef.get();

// //     if (!doc.exists) {
// //       return res.status(404).json({ message: "Módulo não encontrado" });
// //     }

// //     const module = Module.fromFirestore(doc.id, doc.data()!);
// //     module.unpublish(updatedBy);

// //     await moduleRef.set(module.toObject(), { merge: true });

// //     return res.status(200).json({
// //       message: "Módulo despublicado com sucesso",
// //       module: module.toObject(),
// //     });
// //   } catch (err) {
// //     console.error("Erro ao despublicar módulo:", err);
// //     return res.status(500).json({
// //       error: err instanceof Error ? err.message : "Erro ao despublicar módulo",
// //     });
// //   }
// // };

// // export const archiveModule = async (req: Request, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const { updatedBy } = req.body;

// //     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
// //     const doc = await moduleRef.get();

// //     if (!doc.exists) {
// //       return res.status(404).json({ message: "Módulo não encontrado" });
// //     }

// //     const module = Module.fromFirestore(doc.id, doc.data()!);
// //     module.archive(updatedBy);

// //     await moduleRef.set(module.toObject(), { merge: true });

// //     return res.status(200).json({
// //       message: "Módulo arquivado com sucesso",
// //       module: module.toObject(),
// //     });
// //   } catch (err) {
// //     console.error("Erro ao arquivar módulo:", err);
// //     return res.status(500).json({
// //       error: err instanceof Error ? err.message : "Erro ao arquivar módulo",
// //     });
// //   }
// // };

// // export const unarchiveModule = async (req: Request, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const { updatedBy } = req.body;

// //     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
// //     const doc = await moduleRef.get();

// //     if (!doc.exists) {
// //       return res.status(404).json({ message: "Módulo não encontrado" });
// //     }

// //     const module = Module.fromFirestore(doc.id, doc.data()!);
// //     module.unarchive(updatedBy);

// //     await moduleRef.set(module.toObject(), { merge: true });

// //     return res.status(200).json({
// //       message: "Módulo desarquivado com sucesso",
// //       module: module.toObject(),
// //     });
// //   } catch (err) {
// //     console.error("Erro ao desarquivar módulo:", err);
// //     return res.status(500).json({
// //       error: err instanceof Error ? err.message : "Erro ao desarquivar módulo",
// //     });
// //   }
// // };

// export const deleteModule = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     const doc = await db.collection(MODULES_COLLECTION).doc(id).get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Módulo não encontrado" });
//     }

//     await db.recursiveDelete(db.collection(MODULES_COLLECTION).doc(id));

//     return res.status(200).json({ message: "Módulo excluído com sucesso" });
//   } catch (err) {
//     console.error("Erro ao excluir módulo:", err);
//     return res.status(500).json({ error: "Erro ao excluir módulo" });
//   }
// };

import { Request, Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { Module } from "../models/Module";
import { Lesson } from "../models/Lesson";
import { db } from "./../config/firebase";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

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

// Usuário

export const getPublishedModules = async (_: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(MODULES_COLLECTION)
      .where("published", "==", true)
      .where("archived", "==", false)
      .orderBy("sequence", "asc")
      .get();

    const modules = snapshot.docs.map((doc) =>
      Module.fromFirestore(doc.id, doc.data()).toObject(),
    );

    return res.status(200).json(modules);
  } catch (err) {
    console.error("Erro ao buscar módulos publicados:", err);
    return res.status(500).json({ error: "Erro ao buscar módulos publicados" });
  }
};

export const getModulesByTrail = async (req: Request, res: Response) => {
  try {
    const { trailId } = req.params;
    const includeRestricted =
      String(req.query.includeRestricted ?? "false") === "true";

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
    return res.status(500).json({ error: "Erro ao buscar módulos da trilha" });
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
    return res.status(500).json({ error: "Erro ao buscar aulas do módulo" });
  }
};

export const getAccessibleModulesByTrail = async (
  req: Request,
  res: Response,
) => {
  try {
    const { trailId } = req.params;
    const userId = String(req.query.userId ?? "");

    if (!userId) {
      return res.status(400).json({ message: "userId é obrigatório" });
    }

    const [modulesSnap, progressSnap] = await Promise.all([
      db
        .collection(MODULES_COLLECTION)
        .where("trailId", "==", trailId)
        .orderBy("sequence", "asc")
        .get(),
      db
        .collection(USER_MODULE_PROGRESS_COLLECTION)
        .where("userId", "==", userId)
        .where("status", "==", "Concluída")
        .get(),
    ]);

    const allModules = modulesSnap.docs.map((doc) =>
      Module.fromFirestore(doc.id, doc.data()),
    );

    const completedModuleIds = progressSnap.docs.map((doc) =>
      String(doc.data().moduleId ?? ""),
    );

    const accessibleModules = allModules
      .filter(
        (module) =>
          module.published &&
          !module.archived &&
          module.visibility !== "privada" &&
          module.canUserAccess(completedModuleIds, allModules),
      )
      .map((module) => module.toObject());

    return res.status(200).json(accessibleModules);
  } catch (err) {
    console.error("Erro ao buscar módulos acessíveis da trilha:", err);
    return res
      .status(500)
      .json({ error: "Erro ao buscar módulos acessíveis da trilha" });
  }
};

export const getModuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = String(req.query.userId ?? "");
    const isAdminView = String(req.query.admin ?? "false") === "true";

    const doc = await db.collection(MODULES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Módulo não encontrado" });
    }

    const module = Module.fromFirestore(doc.id, doc.data()!);

    if (!isAdminView) {
      if (
        !module.published ||
        module.archived ||
        module.visibility === "privada"
      ) {
        return res.status(403).json({ message: "Módulo indisponível" });
      }

      if (userId) {
        const [progressSnap, trailModulesSnap] = await Promise.all([
          db
            .collection(USER_MODULE_PROGRESS_COLLECTION)
            .where("userId", "==", userId)
            .where("status", "==", "Concluída")
            .get(),
          db
            .collection(MODULES_COLLECTION)
            .where("trailId", "==", module.trailId)
            .orderBy("sequence", "asc")
            .get(),
        ]);

        const completedModuleIds = progressSnap.docs.map((d) =>
          String(d.data().moduleId ?? ""),
        );

        const allModules = trailModulesSnap.docs.map((d) =>
          Module.fromFirestore(d.id, d.data()),
        );

        if (!module.canUserAccess(completedModuleIds, allModules)) {
          return res
            .status(403)
            .json({ message: "Módulo bloqueado por pré-requisitos" });
        }
      }

      module.incrementViews();
      await db
        .collection(MODULES_COLLECTION)
        .doc(id)
        .set(module.toObject(), { merge: true });
    }

    return res.status(200).json(module.toObject());
  } catch (err) {
    console.error("Erro ao buscar módulo pelo ID:", err);
    return res.status(500).json({ error: "Erro ao buscar módulo pelo ID" });
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
        message: "trailId, title, description e sequence são obrigatórios",
      });
    }

    const trailRef = db.collection("trails").doc(trailId);
    const trailDoc = await trailRef.get();

    if (!trailDoc.exists) {
      return res.status(404).json({
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
      error: err instanceof Error ? err.message : "Erro ao criar módulo",
    });
  }
};

// Administração

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
    return res.status(500).json({ error: "Erro ao buscar módulos" });
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
      return res.status(401).json({ message: "Usuário não autenticado." });

    const updatedBy = req.user.uid;

    const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
    const doc = await moduleRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Módulo não encontrado" });
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

        // Atualiza a aula
        batch.update(lessonDoc.ref, {
          status: "disponivel",
          updatedAt: Timestamp.now(),
          updatedBy,
        });

        // Atualiza a versão atual da aula, que é subcoleção de lessons.
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
      error: err instanceof Error ? err.message : "Erro ao atualizar módulo",
    });
  }
};

// export const publishModule = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { updatedBy } = req.body;

//     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
//     const doc = await moduleRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Módulo não encontrado" });
//     }

//     const module = Module.fromFirestore(doc.id, doc.data()!);
//     module.publish(updatedBy);

//     await moduleRef.set(module.toObject(), { merge: true });

//     return res.status(200).json({
//       message: "Módulo publicado com sucesso",
//       module: module.toObject(),
//     });
//   } catch (err) {
//     console.error("Erro ao publicar módulo:", err);
//     return res.status(500).json({
//       error: err instanceof Error ? err.message : "Erro ao publicar módulo",
//     });
//   }
// };

// export const unpublishModule = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { updatedBy } = req.body;

//     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
//     const doc = await moduleRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Módulo não encontrado" });
//     }

//     const module = Module.fromFirestore(doc.id, doc.data()!);
//     module.unpublish(updatedBy);

//     await moduleRef.set(module.toObject(), { merge: true });

//     return res.status(200).json({
//       message: "Módulo despublicado com sucesso",
//       module: module.toObject(),
//     });
//   } catch (err) {
//     console.error("Erro ao despublicar módulo:", err);
//     return res.status(500).json({
//       error: err instanceof Error ? err.message : "Erro ao despublicar módulo",
//     });
//   }
// };

// export const archiveModule = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { updatedBy } = req.body;

//     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
//     const doc = await moduleRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Módulo não encontrado" });
//     }

//     const module = Module.fromFirestore(doc.id, doc.data()!);
//     module.archive(updatedBy);

//     await moduleRef.set(module.toObject(), { merge: true });

//     return res.status(200).json({
//       message: "Módulo arquivado com sucesso",
//       module: module.toObject(),
//     });
//   } catch (err) {
//     console.error("Erro ao arquivar módulo:", err);
//     return res.status(500).json({
//       error: err instanceof Error ? err.message : "Erro ao arquivar módulo",
//     });
//   }
// };

// export const unarchiveModule = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { updatedBy } = req.body;

//     const moduleRef = db.collection(MODULES_COLLECTION).doc(id);
//     const doc = await moduleRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Módulo não encontrado" });
//     }

//     const module = Module.fromFirestore(doc.id, doc.data()!);
//     module.unarchive(updatedBy);

//     await moduleRef.set(module.toObject(), { merge: true });

//     return res.status(200).json({
//       message: "Módulo desarquivado com sucesso",
//       module: module.toObject(),
//     });
//   } catch (err) {
//     console.error("Erro ao desarquivar módulo:", err);
//     return res.status(500).json({
//       error: err instanceof Error ? err.message : "Erro ao desarquivar módulo",
//     });
//   }
// };

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const doc = await db.collection(MODULES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Módulo não encontrado" });
    }

    await db.recursiveDelete(db.collection(MODULES_COLLECTION).doc(id));

    return res.status(200).json({ message: "Módulo excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir módulo:", err);
    return res.status(500).json({ error: "Erro ao excluir módulo" });
  }
};
