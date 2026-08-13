// import { Request, Response } from "express";
// import { FieldValue, Timestamp } from "firebase-admin/firestore";
// import { IEnrollment } from "../../interfaces/Enrollment.interface";
// import { db } from "./../../config/firebase";
// import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
// import { ILesson } from "../../models/Lesson";
// import { IModule } from "../../models/Module";
// import { ITrail } from "../../models/Trails";
// import { recordLearningEventSafe } from "../../services/LearningEventService";

// const ENROLLMENTS_COLLECTION = "enrollments";
// const TRAILS_COLLECTION = "trails";
// const MODULES_COLLECTION = "modules";
// const LESSONS_COLLECTION = "lessons";

// // Usuário

// export const registerEnrollment = async (
//   req: AuthenticatedRequest,
//   res: Response,
// ) => {
//   try {
//     const { trailId } = req.body;

//     if (!req.user) {
//       return res.status(401).json({
//         message: "Usuário não autenticado.",
//       });
//     }

//     const userId = req.user.uid;

//     if (!trailId || typeof trailId !== "string") {
//       return res.status(400).json({
//         message: "trailId é obrigatório.",
//       });
//     }

//     /*
//      * ==============================
//      * VERIFICA SE JÁ EXISTE MATRÍCULA
//      * ==============================
//      */

//     const enrollmentSnap = await db
//       .collection(ENROLLMENTS_COLLECTION)
//       .where("userId", "==", userId)
//       .where("trailId", "==", trailId)
//       .limit(1)
//       .get();

//     if (!enrollmentSnap.empty) {
//       const enrollmentDoc = enrollmentSnap.docs[0];

//       return res.status(409).json({
//         message: "Usuário já matriculado nesta trilha.",
//         enrollment: {
//           ...enrollmentDoc.data(),
//           id: enrollmentDoc.id,
//         },
//       });
//     }

//     /*
//      * ==============================
//      * VERIFICA SE A TRILHA EXISTE
//      * ==============================
//      */

//     const trailRef = db.collection(TRAILS_COLLECTION).doc(trailId);

//     const trailDoc = await trailRef.get();

//     if (!trailDoc.exists) {
//       return res.status(404).json({
//         message: "Trilha não encontrada.",
//       });
//     }

//     const trail = trailDoc.data() as ITrail;

//     if (trail.status !== "disponivel") {
//       return res.status(400).json({
//         message: "Esta trilha não está disponível para matrícula.",
//       });
//     }

//     /*
//      * ==============================
//      * VALIDA OS PRÉ-REQUISITOS
//      * ==============================
//      */

//     const prerequisiteTrailIds = trail.prerequisiteTrailIds ?? [];

//     if (prerequisiteTrailIds.length > 0) {
//       const prerequisiteEnrollmentsSnap = await db
//         .collection(ENROLLMENTS_COLLECTION)
//         .where("userId", "==", userId)
//         .where("trailId", "in", prerequisiteTrailIds.slice(0, 10))
//         .get();

//       const completedPrerequisiteIds = new Set(
//         prerequisiteEnrollmentsSnap.docs
//           .filter((doc) => doc.data().status === "concluido")
//           .map((doc) => doc.data().trailId as string),
//       );

//       const missingPrerequisiteIds = prerequisiteTrailIds.filter(
//         (prerequisiteId) => !completedPrerequisiteIds.has(prerequisiteId),
//       );

//       if (missingPrerequisiteIds.length > 0) {
//         await recordLearningEventSafe({
//           userId,
//           type: "trail_blocked",
//           trailId,
//           metadata: {
//             missingPrerequisiteIds,
//           },
//         });

//         return res.status(403).json({
//           message: "Conclua os pré-requisitos antes de realizar a matrícula.",
//           prerequisiteTrailIds: missingPrerequisiteIds,
//         });
//       }
//     }

//     /*
//      * ==============================
//      * PRIMEIRO MÓDULO DA TRILHA
//      * ==============================
//      */

//     const modulesSnap = await db
//       .collection(MODULES_COLLECTION)
//       .where("trailId", "==", trailId)
//       .where("status", "==", "disponivel")
//       .orderBy("sequence", "asc")
//       .limit(1)
//       .get();

//     if (modulesSnap.empty) {
//       return res.status(400).json({
//         message: "A trilha não possui módulos disponíveis.",
//       });
//     }

//     const firstModuleDoc = modulesSnap.docs[0];
//     const currentModuleId = firstModuleDoc.id;

//     /*
//      * ==============================
//      * PRIMEIRA AULA DO MÓDULO
//      * ==============================
//      */

//     const lessonsSnap = await db
//       .collection(LESSONS_COLLECTION)
//       .where("moduleId", "==", currentModuleId)
//       .where("status", "==", "disponivel")
//       .orderBy("sequence", "asc")
//       .limit(1)
//       .get();

//     if (lessonsSnap.empty) {
//       return res.status(400).json({
//         message: "O primeiro módulo da trilha não possui aulas disponíveis.",
//       });
//     }

//     const currentLessonId = lessonsSnap.docs[0].id;
//     const now = Timestamp.now();

//     /*
//      * ==============================
//      * CRIA A MATRÍCULA
//      * ==============================
//      */

//     const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc();

//     const enrollment: IEnrollment = {
//       id: enrollmentRef.id,

//       userId,
//       trailId,

//       status: "matriculado",
//       progress: 0,

//       currentModuleId,
//       currentLessonId,

//       completedModules: 0,
//       completedLessons: 0,

//       xp: 0,

//       startedAt: now,
//       lastAccessAt: now,

//       completedModulesMap: {},
//       completedLessonsMap: {},
//     };

//     await enrollmentRef.set(enrollment);

//     await recordLearningEventSafe({
//       userId,
//       type: "trail_enrolled",
//       trailId,
//       moduleId: currentModuleId,
//       lessonId: currentLessonId,
//       metadata: {
//         enrollmentId: enrollmentRef.id,
//       },
//     });

//     return res.status(201).json({
//       message: "Matrícula criada com sucesso.",
//       enrollment,
//     });
//   } catch (err) {
//     console.error("Erro ao criar matrícula:", err);

//     return res.status(500).json({
//       message: err instanceof Error ? err.message : "Erro ao criar matrícula.",
//     });
//   }
// };

// export const getEnrollment = async (
//   req: AuthenticatedRequest,
//   res: Response,
// ) => {
//   try {
//     const { id } = req.params;

//     if (!req.user) return;

//     const userId = req.user.uid;

//     if (!userId) {
//       return res.status(400).json({ message: "userId é obrigatório" });
//     }

//     const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc(id);
//     const enrollmentDoc = await enrollmentRef.get();

//     if (!enrollmentDoc.exists) {
//       return res.status(404).json({
//         message: "Matrícula não encontrada.",
//       });
//     }

//     const enrollment = enrollmentDoc.data() as IEnrollment;

//     // Garante que a matrícula pertence ao usuário
//     if (enrollment.userId !== userId) {
//       return res.status(403).json({
//         message: "Você não tem permissão para acessar esta matrícula.",
//       });
//     }

//     const trailDoc = await db
//       .collection(TRAILS_COLLECTION)
//       .doc(enrollment.trailId)
//       .get();

//     const trail = trailDoc.exists ? trailDoc.data() : null;

//     const progress = !trail?.totalLessons
//       ? 0
//       : Math.round((enrollment.completedLessons / trail.totalLessons) * 100);

//     return res.status(200).json({
//       ...enrollment,
//       progress,
//     });
//   } catch (err) {
//     console.error(err);

//     return res.status(500).json({
//       message: "Erro ao buscar matrícula.",
//     });
//   }
// };

// export const patchEnrollment = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { userId, ...data } = req.body;

//     if (!id) {
//       return res.status(400).json({
//         message: "Id da matrícula é obrigatório.",
//       });
//     }

//     if (!userId) {
//       return res.status(400).json({
//         message: "Uid é obrigatório.",
//       });
//     }

//     const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc(id);

//     const enrollmentDoc = await enrollmentRef.get();

//     if (!enrollmentDoc.exists) {
//       return res.status(404).json({
//         message: "Matrícula não encontrada.",
//       });
//     }

//     const enrollment = enrollmentDoc.data();

//     if (enrollment?.userId !== userId) {
//       return res.status(403).json({
//         message: "Você não possui permissão para alterar esta matrícula.",
//       });
//     }

//     const updatedEnrollment = {
//       ...data,
//       lastAccessAt: Timestamp.now(),
//     };

//     await enrollmentRef.set(updatedEnrollment, {
//       merge: true,
//     });

//     const updatedDoc = await enrollmentRef.get();

//     return res.status(200).json({
//       message: "Matrícula atualizada com sucesso.",
//       enrollment: {
//         id: updatedDoc.id,
//         ...updatedDoc.data(),
//       },
//     });
//   } catch (err) {
//     console.error(err);

//     return res.status(500).json({
//       message: "Erro ao atualizar matrícula.",
//     });
//   }
// };

// export const getMyEnrollments = async (
//   req: AuthenticatedRequest,
//   res: Response,
// ) => {
//   try {
//     if (!req.user) return;

//     const id = req.user.uid;

//     if (!id) {
//       return res.status(400).json({ message: "userId é obrigatório" });
//     }

//     const snapshot = await db
//       .collection(ENROLLMENTS_COLLECTION)
//       .where("userId", "==", id)
//       .get();

//     const enrollments = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     return res.status(200).json(enrollments);
//   } catch (err) {
//     console.error(err);

//     return res.status(500).json({
//       message: "Erro ao buscar matrículas.",
//     });
//   }
// };

// type EnrollmentControllerError = Error & {
//   status: number;
// };

// const createEnrollmentError = (
//   status: number,
//   message: string,
// ): EnrollmentControllerError => {
//   return Object.assign(new Error(message), { status });
// };

// interface CompleteLessonResult {
//   enrollment: IEnrollment;
//   nextLessonId: string | null;
//   completedModuleId: string;
//   alreadyCompleted: boolean;
// }

// export const completeLesson = async (
//   req: AuthenticatedRequest,
//   res: Response,
// ) => {
//   try {
//     const enrollmentId = req.params.id;
//     const lessonId = req.body?.lessonId;

//     console.log({ req: req.user });
//     if (!req.user) {
//       return res.status(401).json({
//         message: "Usuário não autenticado.",
//       });
//     }

//     const userId = req.user.uid;

//     if (typeof enrollmentId !== "string" || enrollmentId.trim() === "") {
//       return res.status(400).json({
//         message: "O ID da matrícula é obrigatório.",
//       });
//     }

//     if (typeof lessonId !== "string" || lessonId.trim() === "") {
//       return res.status(400).json({
//         message: "O ID da aula é obrigatório.",
//       });
//     }

//     const enrollmentRef = db
//       .collection(ENROLLMENTS_COLLECTION)
//       .doc(enrollmentId);

//     const lessonRef = db.collection(LESSONS_COLLECTION).doc(lessonId);

//     const result = await db.runTransaction<CompleteLessonResult>(async (tx) => {
//       /*
//        * ==============================
//        * MATRÍCULA
//        * ==============================
//        */

//       const enrollmentDoc = await tx.get(enrollmentRef);

//       if (!enrollmentDoc.exists) {
//         throw createEnrollmentError(404, "Matrícula não encontrada.");
//       }

//       const enrollment: IEnrollment = {
//         ...(enrollmentDoc.data() as Omit<IEnrollment, "id">),
//         id: enrollmentDoc.id,
//       };

//       if (enrollment.userId !== userId) {
//         throw createEnrollmentError(
//           403,
//           "Você não possui permissão para alterar esta matrícula.",
//         );
//       }

//       if (enrollment.status === "cancelado") {
//         throw createEnrollmentError(
//           400,
//           "Não é possível concluir aulas de uma matrícula cancelada.",
//         );
//       }

//       if (enrollment.status === "concluido") {
//         throw createEnrollmentError(400, "Esta matrícula já foi concluída.");
//       }

//       /*
//        * ==============================
//        * AULA
//        * ==============================
//        */

//       const lessonRef = db.collection(LESSONS_COLLECTION).doc(lessonId);

//       const lessonDoc = await tx.get(lessonRef);

//       if (!lessonDoc.exists) {
//         throw createEnrollmentError(404, "Aula não encontrada.");
//       }

//       const lesson: ILesson & { id: string } = {
//         ...(lessonDoc.data() as Omit<ILesson, "id">),
//         id: lessonDoc.id,
//       };

//       /*
//        * ==============================
//        * MÓDULO DA AULA
//        * ==============================
//        */

//       const moduleRef = db.collection(MODULES_COLLECTION).doc(lesson.moduleId);

//       const moduleDoc = await tx.get(moduleRef);

//       if (!moduleDoc.exists) {
//         throw createEnrollmentError(404, "Módulo da aula não encontrado.");
//       }

//       const currentModule: IModule & { id: string } = {
//         ...(moduleDoc.data() as Omit<IModule, "id">),
//         id: moduleDoc.id,
//       };

//       if (currentModule.trailId !== enrollment.trailId) {
//         throw createEnrollmentError(
//           400,
//           "A aula não pertence à trilha desta matrícula.",
//         );
//       }

//       /*
//        * ==============================
//        * MÓDULOS DA TRILHA
//        * ==============================
//        */

//       const modulesQuery = db
//         .collection(MODULES_COLLECTION)
//         .where("trailId", "==", enrollment.trailId)
//         .where("status", "==", "disponivel")
//         .orderBy("sequence", "asc");

//       const modulesSnap = await tx.get(modulesQuery);

//       const modules: Array<IModule & { id: string }> = modulesSnap.docs.map(
//         (doc) => ({
//           ...(doc.data() as Omit<IModule, "id">),
//           id: doc.id,
//         }),
//       );

//       if (modules.length === 0) {
//         throw createEnrollmentError(
//           400,
//           "A trilha não possui módulos disponíveis.",
//         );
//       }

//       const currentModuleIndex = modules.findIndex(
//         (moduleItem) => moduleItem.id === currentModule.id,
//       );

//       if (currentModuleIndex === -1) {
//         throw createEnrollmentError(
//           400,
//           "O módulo da aula não está disponível nesta trilha.",
//         );
//       }

//       /*
//        * ==============================
//        * AULAS DOS MÓDULOS
//        * ==============================
//        */

//       const lessonsByModule = new Map<
//         string,
//         Array<ILesson & { id: string }>
//       >();

//       for (const moduleItem of modules) {
//         const lessonsQuery = db
//           .collection(LESSONS_COLLECTION)
//           .where("moduleId", "==", moduleItem.id)
//           .where("status", "==", "disponivel")
//           .orderBy("sequence", "asc");

//         const lessonsSnap = await tx.get(lessonsQuery);

//         const moduleLessons: Array<ILesson & { id: string }> =
//           lessonsSnap.docs.map((doc) => ({
//             ...(doc.data() as Omit<ILesson, "id">),
//             id: doc.id,
//           }));

//         lessonsByModule.set(moduleItem.id, moduleLessons);
//       }

//       const currentModuleLessons = lessonsByModule.get(currentModule.id) ?? [];

//       if (currentModuleLessons.length === 0) {
//         throw createEnrollmentError(
//           400,
//           "O módulo não possui aulas disponíveis.",
//         );
//       }

//       const currentLessonIndex = currentModuleLessons.findIndex(
//         (lessonItem) => lessonItem.id === lessonId,
//       );

//       if (currentLessonIndex === -1) {
//         throw createEnrollmentError(
//           400,
//           "A aula não está disponível no módulo informado.",
//         );
//       }

//       /*
//        * ==============================
//        * AULA CONCLUÍDA
//        * ==============================
//        */

//       const completedLessonsMap: Record<string, true> = {
//         ...(enrollment.completedLessonsMap ?? {}),
//       };

//       const alreadyCompleted = completedLessonsMap[lessonId] === true;
//       completedLessonsMap[lessonId] = true;

//       /*
//        * ==============================
//        * MÓDULOS CONCLUÍDOS
//        * ==============================
//        */

//       const completedModulesMap: Record<string, true> = {
//         ...(enrollment.completedModulesMap ?? {}),
//       };

//       for (const moduleItem of modules) {
//         const moduleLessons = lessonsByModule.get(moduleItem.id) ?? [];

//         const moduleCompleted =
//           moduleLessons.length > 0 &&
//           moduleLessons.every(
//             (lessonItem) => completedLessonsMap[lessonItem.id] === true,
//           );

//         if (moduleCompleted) {
//           completedModulesMap[moduleItem.id] = true;
//         } else {
//           delete completedModulesMap[moduleItem.id];
//         }
//       }

//       /*
//        * ==============================
//        * CONTADORES E PROGRESSO
//        * ==============================
//        */

//       const allLessons = modules.flatMap(
//         (moduleItem) => lessonsByModule.get(moduleItem.id) ?? [],
//       );

//       const completedLessons = allLessons.filter(
//         (lessonItem) => completedLessonsMap[lessonItem.id] === true,
//       ).length;

//       const completedModules = modules.filter(
//         (moduleItem) => completedModulesMap[moduleItem.id] === true,
//       ).length;

//       const totalLessons = allLessons.length;

//       const progress =
//         totalLessons === 0
//           ? 0
//           : Math.min(100, Math.round((completedLessons / totalLessons) * 100));

//       /*
//        * ==============================
//        * PRÓXIMA AULA
//        * ==============================
//        */

//       let nextPosition: {
//         moduleId: string;
//         lessonId: string;
//       } | null = null;

//       // Primeiro procura a próxima aula do módulo atual.
//       for (
//         let index = currentLessonIndex + 1;
//         index < currentModuleLessons.length;
//         index++
//       ) {
//         const nextLesson = currentModuleLessons[index];

//         if (!completedLessonsMap[nextLesson.id]) {
//           nextPosition = {
//             moduleId: currentModule.id,
//             lessonId: nextLesson.id,
//           };

//           break;
//         }
//       }

//       // Se acabou o módulo atual, procura nos módulos seguintes.
//       if (!nextPosition) {
//         for (
//           let moduleIndex = currentModuleIndex + 1;
//           moduleIndex < modules.length;
//           moduleIndex++
//         ) {
//           const nextModule = modules[moduleIndex];
//           const nextModuleLessons = lessonsByModule.get(nextModule.id) ?? [];

//           const nextLesson = nextModuleLessons.find(
//             (lessonItem) => !completedLessonsMap[lessonItem.id],
//           );

//           if (nextLesson) {
//             nextPosition = {
//               moduleId: nextModule.id,
//               lessonId: nextLesson.id,
//             };

//             break;
//           }
//         }
//       }

//       /*
//        * Evita concluir a matrícula caso exista alguma aula anterior
//        * ainda não concluída.
//        */
//       if (!nextPosition) {
//         for (const moduleItem of modules) {
//           const moduleLessons = lessonsByModule.get(moduleItem.id) ?? [];

//           const pendingLesson = moduleLessons.find(
//             (lessonItem) => !completedLessonsMap[lessonItem.id],
//           );

//           if (pendingLesson) {
//             nextPosition = {
//               moduleId: moduleItem.id,
//               lessonId: pendingLesson.id,
//             };

//             break;
//           }
//         }
//       }

//       const now = Timestamp.now();

//       /*
//        * ==============================
//        * MATRÍCULA CONCLUÍDA
//        * ==============================
//        */

//       if (!nextPosition) {
//         tx.update(enrollmentRef, {
//           status: "concluido",
//           progress: 100,
//           completedLessons,
//           completedModules,
//           completedLessonsMap,
//           completedModulesMap,
//           currentModuleId: FieldValue.delete(),
//           currentLessonId: FieldValue.delete(),
//           completedAt: now,
//           lastAccessAt: now,
//         });

//         const {
//           currentModuleId: _currentModuleId,
//           currentLessonId: _currentLessonId,
//           ...enrollmentWithoutCurrentPosition
//         } = enrollment;

//         const completedEnrollment: IEnrollment = {
//           ...enrollmentWithoutCurrentPosition,
//           status: "concluido",
//           progress: 100,
//           completedLessons,
//           completedModules,
//           completedLessonsMap,
//           completedModulesMap,
//           completedAt: now,
//           lastAccessAt: now,
//         };

//         return {
//           enrollment: completedEnrollment,
//           nextLessonId: null,
//           completedModuleId: currentModule.id,
//           alreadyCompleted,
//         };
//       }

//       /*
//        * ==============================
//        * AVANÇA PARA A PRÓXIMA AULA
//        * ==============================
//        */

//       tx.update(enrollmentRef, {
//         status: "matriculado",
//         progress,
//         completedLessons,
//         completedModules,
//         completedLessonsMap,
//         completedModulesMap,
//         currentModuleId: nextPosition.moduleId,
//         currentLessonId: nextPosition.lessonId,
//         lastAccessAt: now,
//       });

//       const activeEnrollment: IEnrollment = {
//         ...enrollment,
//         status: "matriculado",
//         progress,
//         completedLessons,
//         completedModules,
//         completedLessonsMap,
//         completedModulesMap,
//         currentModuleId: nextPosition.moduleId,
//         currentLessonId: nextPosition.lessonId,
//         lastAccessAt: now,
//       };

//       return {
//         enrollment: activeEnrollment,
//         nextLessonId: nextPosition.lessonId,
//         completedModuleId: currentModule.id,
//         alreadyCompleted,
//       };
//     });

//     const updatedEnrollment = result.enrollment;

//     if (!result.alreadyCompleted) {
//       const completedLessonDoc = await lessonRef.get();
//       const completedLessonData = completedLessonDoc.data();
//       let lessonName: string | null = null;

//       if (completedLessonData?.currentVersionId) {
//         const versionDoc = await lessonRef
//           .collection("versions")
//           .doc(String(completedLessonData.currentVersionId))
//           .get();

//         if (versionDoc.exists) {
//           const versionData = versionDoc.data();
//           lessonName = String(versionData?.title ?? "").trim() || null;
//         }
//       }

//       await recordLearningEventSafe({
//         userId,
//         type: "lesson_completed",
//         trailId: updatedEnrollment.trailId,
//         moduleId: result.completedModuleId,
//         lessonId,
//         lessonName,
//         metadata: {
//           enrollmentId: updatedEnrollment.id,
//           progress: updatedEnrollment.progress,
//         },
//       });

//       if (updatedEnrollment.status === "concluido") {
//         await recordLearningEventSafe({
//           userId,
//           type: "trail_completed",
//           trailId: updatedEnrollment.trailId,
//           moduleId: result.completedModuleId,
//           lessonId,
//           metadata: {
//             enrollmentId: updatedEnrollment.id,
//           },
//         });
//       }
//     }

//     type LessonWithCurrentVersion = Omit<ILesson, "version"> & {
//       id: string;
//       version?: Record<string, unknown>;
//     };

//     let nextLesson: LessonWithCurrentVersion | null = null;

//     if (result.nextLessonId) {
//       const nextLessonRef = db
//         .collection(LESSONS_COLLECTION)
//         .doc(result.nextLessonId);

//       const nextLessonDoc = await nextLessonRef.get();

//       if (nextLessonDoc.exists) {
//         const nextLessonData = nextLessonDoc.data() as ILesson;

//         let version: Record<string, unknown> | undefined;

//         if (nextLessonData.currentVersionId) {
//           const versionDoc = await nextLessonRef
//             .collection("versions")
//             .doc(nextLessonData.currentVersionId)
//             .get();

//           if (versionDoc.exists) {
//             version = {
//               ...versionDoc.data(),
//               id: versionDoc.id,
//             };
//           }
//         }

//         nextLesson = {
//           ...nextLessonData,
//           id: nextLessonDoc.id,
//           version,
//         };
//       }
//     }

//     return res.status(200).json({
//       message:
//         updatedEnrollment.status === "concluido"
//           ? "Trilha concluída com sucesso."
//           : "Aula concluída com sucesso.",

//       enrollment: updatedEnrollment,
//       nextLesson,
//     });
//   } catch (err) {
//     console.error("Erro ao concluir aula:", err);

//     const status =
//       err instanceof Error &&
//       "status" in err &&
//       typeof (err as EnrollmentControllerError).status === "number"
//         ? (err as EnrollmentControllerError).status
//         : 500;

//     return res.status(status).json({
//       message: err instanceof Error ? err.message : "Erro ao concluir aula.",
//     });
//   }
// };
// // Administração

import { Request, Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { IEnrollment } from "../../interfaces/Enrollment.interface";
import { db } from "./../../config/firebase";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { ILesson } from "../../models/Lesson";
import { IModule } from "../../models/Module";
import { ITrail } from "../../models/Trails";

const ENROLLMENTS_COLLECTION = "enrollments";
const TRAILS_COLLECTION = "trails";
const MODULES_COLLECTION = "modules";
const LESSONS_COLLECTION = "lessons";

// Usuário

export const registerEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { trailId } = req.body;

    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    if (!trailId || typeof trailId !== "string") {
      return res.status(400).json({
        message: "trailId é obrigatório.",
      });
    }

    /*
     * ==============================
     * VERIFICA SE JÁ EXISTE MATRÍCULA
     * ==============================
     */

    const enrollmentSnap = await db
      .collection(ENROLLMENTS_COLLECTION)
      .where("userId", "==", userId)
      .where("trailId", "==", trailId)
      .limit(1)
      .get();

    if (!enrollmentSnap.empty) {
      const enrollmentDoc = enrollmentSnap.docs[0];

      return res.status(409).json({
        message: "Usuário já matriculado nesta trilha.",
        enrollment: {
          ...enrollmentDoc.data(),
          id: enrollmentDoc.id,
        },
      });
    }

    /*
     * ==============================
     * VERIFICA SE A TRILHA EXISTE
     * ==============================
     */

    const trailRef = db.collection(TRAILS_COLLECTION).doc(trailId);

    const trailDoc = await trailRef.get();

    if (!trailDoc.exists) {
      return res.status(404).json({
        message: "Trilha não encontrada.",
      });
    }

    const trail = trailDoc.data() as ITrail;

    if (trail.status !== "disponivel") {
      return res.status(400).json({
        message: "Esta trilha não está disponível para matrícula.",
      });
    }

    /*
     * ==============================
     * VALIDA OS PRÉ-REQUISITOS
     * ==============================
     */

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
          message: "Conclua os pré-requisitos antes de realizar a matrícula.",
          prerequisiteTrailIds: missingPrerequisiteIds,
        });
      }
    }

    /*
     * ==============================
     * PRIMEIRO MÓDULO DA TRILHA
     * ==============================
     */

    const modulesSnap = await db
      .collection(MODULES_COLLECTION)
      .where("trailId", "==", trailId)
      .where("status", "==", "disponivel")
      .orderBy("sequence", "asc")
      .limit(1)
      .get();

    if (modulesSnap.empty) {
      return res.status(400).json({
        message: "A trilha não possui módulos disponíveis.",
      });
    }

    const firstModuleDoc = modulesSnap.docs[0];
    const currentModuleId = firstModuleDoc.id;

    /*
     * ==============================
     * PRIMEIRA AULA DO MÓDULO
     * ==============================
     */

    const lessonsSnap = await db
      .collection(LESSONS_COLLECTION)
      .where("moduleId", "==", currentModuleId)
      .where("status", "==", "disponivel")
      .orderBy("sequence", "asc")
      .limit(1)
      .get();

    if (lessonsSnap.empty) {
      return res.status(400).json({
        message: "O primeiro módulo da trilha não possui aulas disponíveis.",
      });
    }

    const currentLessonId = lessonsSnap.docs[0].id;
    const now = Timestamp.now();

    /*
     * ==============================
     * CRIA A MATRÍCULA
     * ==============================
     */

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
      return res.status(400).json({ message: "userId é obrigatório" });
    }

    const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc(id);
    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return res.status(404).json({
        message: "Matrícula não encontrada.",
      });
    }

    const enrollment = enrollmentDoc.data() as IEnrollment;

    // Garante que a matrícula pertence ao usuário
    if (enrollment.userId !== userId) {
      return res.status(403).json({
        message: "Você não tem permissão para acessar esta matrícula.",
      });
    }

    return res.status(200).json({
      ...enrollment,
      /*
       * O progresso passa a ser persistido pelo LearningFlowService,
       * pois o denominador inclui aulas práticas e avaliações finais.
       */
      progress: Number(enrollment.progress ?? 0),
      completedAssessments: Number(enrollment.completedAssessments ?? 0),
      completedAssessmentsMap: enrollment.completedAssessmentsMap ?? {},
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
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
        message: "Id da matrícula é obrigatório.",
      });
    }

    if (!userId) {
      return res.status(400).json({
        message: "Uid é obrigatório.",
      });
    }

    const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc(id);

    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return res.status(404).json({
        message: "Matrícula não encontrada.",
      });
    }

    const enrollment = enrollmentDoc.data();

    if (enrollment?.userId !== userId) {
      return res.status(403).json({
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
      return res.status(400).json({ message: "userId é obrigatório" });
    }

    const snapshot = await db
      .collection(ENROLLMENTS_COLLECTION)
      .where("userId", "==", id)
      .get();

    const enrollments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(enrollments);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
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
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    if (typeof enrollmentId !== "string" || enrollmentId.trim() === "") {
      return res.status(400).json({
        message: "O ID da matrícula é obrigatório.",
      });
    }

    if (typeof lessonId !== "string" || lessonId.trim() === "") {
      return res.status(400).json({
        message: "O ID da aula é obrigatório.",
      });
    }

    const enrollmentRef = db
      .collection(ENROLLMENTS_COLLECTION)
      .doc(enrollmentId);

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(lessonId);

    const result = await db.runTransaction<CompleteLessonResult>(async (tx) => {
      /*
       * ==============================
       * MATRÍCULA
       * ==============================
       */

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

      /*
       * ==============================
       * AULA
       * ==============================
       */

      const lessonRef = db.collection(LESSONS_COLLECTION).doc(lessonId);

      const lessonDoc = await tx.get(lessonRef);

      if (!lessonDoc.exists) {
        throw createEnrollmentError(404, "Aula não encontrada.");
      }

      const lesson: ILesson & { id: string } = {
        ...(lessonDoc.data() as Omit<ILesson, "id">),
        id: lessonDoc.id,
      };

      /*
       * ==============================
       * MÓDULO DA AULA
       * ==============================
       */

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

      /*
       * ==============================
       * MÓDULOS DA TRILHA
       * ==============================
       */

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

      /*
       * ==============================
       * AULAS DOS MÓDULOS
       * ==============================
       */

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

      /*
       * ==============================
       * AULA CONCLUÍDA
       * ==============================
       */

      const completedLessonsMap: Record<string, true> = {
        ...(enrollment.completedLessonsMap ?? {}),
      };

      completedLessonsMap[lessonId] = true;

      /*
       * ==============================
       * MÓDULOS CONCLUÍDOS
       * ==============================
       */

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

      /*
       * ==============================
       * CONTADORES E PROGRESSO
       * ==============================
       */

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

      /*
       * ==============================
       * PRÓXIMA AULA
       * ==============================
       */

      let nextPosition: {
        moduleId: string;
        lessonId: string;
      } | null = null;

      // Primeiro procura a próxima aula do módulo atual.
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

      // Se acabou o módulo atual, procura nos módulos seguintes.
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

      /*
       * Evita concluir a matrícula caso exista alguma aula anterior
       * ainda não concluída.
       */
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

      /*
       * ==============================
       * MATRÍCULA CONCLUÍDA
       * ==============================
       */

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

      /*
       * ==============================
       * AVANÇA PARA A PRÓXIMA AULA
       * ==============================
       */

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
// Administração
