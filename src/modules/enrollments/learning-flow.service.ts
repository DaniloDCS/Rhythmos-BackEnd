import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { IEnrollment } from "./enrollment.types";
import type { ILesson2, ILessonVersion2 } from "../lessons/lesson.model";
import type { IModule } from "../learning-modules/module.model";
import { LearningFlowResult, LearningStep } from "./learning-flow.types";

const ENROLLMENTS = "enrollments";
const MODULES = "modules";
const LESSONS = "lessons";
const ASSESSMENTS = "assessments";
const LESSON_VERSIONS = "versions";

type ExtendedEnrollment = IEnrollment & {
  currentAssessmentId?: string;
  completedAssessmentsMap?: Record<string, true>;
  completedAssessments?: number;
};

type LessonRecord = ILesson2 & {
  id: string;
  version?: ILessonVersion2;
};

type ModuleRecord = IModule & { id: string };

const flowError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

export class LearningFlowService {
  private static async getOwnedEnrollment(
    enrollmentId: string,
    userId: string,
  ): Promise<ExtendedEnrollment> {
    const snapshot = await db.collection(ENROLLMENTS).doc(enrollmentId).get();
    if (!snapshot.exists) throw flowError(404, "Matrícula não encontrada.");

    const enrollment = {
      ...(snapshot.data() as ExtendedEnrollment),
      id: snapshot.id,
    };

    if (enrollment.userId !== userId) {
      throw flowError(403, "Você não possui acesso a esta matrícula.");
    }
    if (enrollment.status === "cancelado") {
      throw flowError(400, "A matrícula está cancelada.");
    }
    const trailSnapshot = await db.collection("trails").doc(enrollment.trailId).get();
    if (!trailSnapshot.exists) throw flowError(404, "Trilha não encontrada.");
    if (trailSnapshot.data()?.enrolledAccessPolicy === "paused") {
      throw flowError(403, "O acesso dos alunos matriculados nesta trilha está temporariamente suspenso.");
    }
    return enrollment;
  }

  private static async getModules(trailId: string): Promise<ModuleRecord[]> {
    const snapshot = await db
      .collection(MODULES)
      .where("trailId", "==", trailId)
      .where("status", "==", "disponivel")
      .orderBy("sequence", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      ...(doc.data() as IModule),
      id: doc.id,
    }));
  }

  private static async getLessonsByModule(
    moduleId: string,
  ): Promise<LessonRecord[]> {
    const snapshot = await db
      .collection(LESSONS)
      .where("moduleId", "==", moduleId)
      .where("status", "==", "disponivel")
      .orderBy("sequence", "asc")
      .get();

    return Promise.all(
      snapshot.docs.map(async (doc) => {
        const lesson = {
          ...(doc.data() as ILesson2),
          id: doc.id,
        } as LessonRecord;

        const versionId = lesson.publishedVersionId ?? lesson.currentVersionId;
        if (versionId) {
          const versionSnapshot = await doc.ref
            .collection(LESSON_VERSIONS)
            .doc(versionId)
            .get();
          if (versionSnapshot.exists) {
            lesson.version = {
              ...(versionSnapshot.data() as ILessonVersion2),
              id: versionSnapshot.id,
              lessonId: doc.id,
            };
          }
        }
        return lesson;
      }),
    );
  }

  private static async getStructure(trailId: string) {
    const modules = await this.getModules(trailId);
    const lessonsByModule = new Map<string, LessonRecord[]>();

    await Promise.all(
      modules.map(async (module) => {
        lessonsByModule.set(
          module.id,
          await this.getLessonsByModule(module.id),
        );
      }),
    );

    return { modules, lessonsByModule };
  }

  private static stepForLesson(lesson: LessonRecord): LearningStep {
    return lesson.version?.delivery === "practice"
      ? { type: "practice", lessonId: lesson.id }
      : { type: "lesson", lessonId: lesson.id };
  }

  private static calculateProgress(
    modules: ModuleRecord[],
    lessonsByModule: Map<string, LessonRecord[]>,
    completedLessonsMap: Record<string, true>,
    completedAssessmentsMap: Record<string, true>,
  ) {
    const lessonIds = modules.flatMap((module) =>
      (lessonsByModule.get(module.id) ?? []).map((lesson) => lesson.id),
    );
    const finalAssessmentIds = modules
      .map((module) => module.finalAssessmentId)
      .filter((id): id is string => Boolean(id));

    const totalSteps = lessonIds.length + finalAssessmentIds.length;
    const completedSteps =
      lessonIds.filter((id) => completedLessonsMap[id]).length +
      finalAssessmentIds.filter((id) => completedAssessmentsMap[id]).length;

    return {
      completedLessons: lessonIds.filter((id) => completedLessonsMap[id])
        .length,
      completedAssessments: finalAssessmentIds.filter(
        (id) => completedAssessmentsMap[id],
      ).length,
      progress:
        totalSteps === 0
          ? 0
          : Math.min(100, Math.round((completedSteps / totalSteps) * 100)),
    };
  }

  private static async ensureLessonAssessmentPassed(
    lesson: LessonRecord,
    enrollment: ExtendedEnrollment,
  ) {
    const assessmentId = lesson.version?.assessmentId;
    if (!assessmentId) return;

    const assessmentSnapshot = await db
      .collection(ASSESSMENTS)
      .doc(assessmentId)
      .get();
    if (!assessmentSnapshot.exists) {
      throw flowError(400, "A avaliação vinculada à aula não foi encontrada.");
    }

    const assessment = assessmentSnapshot.data();
    if (
      assessment?.required !== false &&
      !enrollment.completedAssessmentsMap?.[assessmentId]
    ) {
      throw flowError(
        409,
        "Conclua e seja aprovado na avaliação da aula antes de avançar.",
      );
    }
  }

  static async getCurrentStep(enrollmentId: string, userId: string) {
    const enrollment = await this.getOwnedEnrollment(enrollmentId, userId);
    if (enrollment.status === "concluido") {
      return { enrollment, nextStep: { type: "complete" } as LearningStep };
    }

    if (enrollment.currentAssessmentId) {
      return {
        enrollment,
        nextStep: {
          type: "assessment",
          assessmentId: enrollment.currentAssessmentId,
        } as LearningStep,
      };
    }

    if (!enrollment.currentLessonId) {
      throw flowError(409, "A matrícula não possui uma etapa atual definida.");
    }

    const lesson = await this.getLesson(enrollment.currentLessonId);
    return {
      enrollment,
      lesson,
      nextStep: this.stepForLesson(lesson),
    };
  }

  static async getLesson(lessonId: string): Promise<LessonRecord> {
    const snapshot = await db.collection(LESSONS).doc(lessonId).get();
    if (!snapshot.exists) throw flowError(404, "Aula não encontrada.");

    const lesson = {
      ...(snapshot.data() as ILesson2),
      id: snapshot.id,
    } as LessonRecord;
    const versionId = lesson.publishedVersionId ?? lesson.currentVersionId;

    if (versionId) {
      const versionSnapshot = await snapshot.ref
        .collection(LESSON_VERSIONS)
        .doc(versionId)
        .get();
      if (versionSnapshot.exists) {
        lesson.version = {
          ...(versionSnapshot.data() as ILessonVersion2),
          id: versionSnapshot.id,
          lessonId,
        };
      }
    }
    return lesson;
  }

  private static async finishLesson(
    enrollment: ExtendedEnrollment,
    lesson: LessonRecord,
  ): Promise<LearningFlowResult> {
    const { modules, lessonsByModule } = await this.getStructure(
      enrollment.trailId,
    );
    const currentModuleIndex = modules.findIndex(
      (module) => module.id === lesson.moduleId,
    );
    if (currentModuleIndex < 0) {
      throw flowError(400, "O módulo da aula não está disponível.");
    }

    const completedLessonsMap: Record<string, true> = {
      ...(enrollment.completedLessonsMap ?? {}),
    };
    const alreadyCompleted = completedLessonsMap[lesson.id] === true;
    completedLessonsMap[lesson.id] = true;

    const completedAssessmentsMap: Record<string, true> = {
      ...(enrollment.completedAssessmentsMap ?? {}),
    };
    const completedModulesMap: Record<string, true> = {
      ...(enrollment.completedModulesMap ?? {}),
    };

    const currentModule = modules[currentModuleIndex];
    const currentLessons = lessonsByModule.get(currentModule.id) ?? [];
    const pendingCurrentLesson = currentLessons.find(
      (item) => !completedLessonsMap[item.id],
    );

    let nextStep: LearningStep | null = null;
    let currentModuleId: string | undefined = currentModule.id;
    let currentLessonId: string | undefined;
    let currentAssessmentId: string | undefined;
    let newlyCompletedModule = false;

    if (pendingCurrentLesson) {
      currentLessonId = pendingCurrentLesson.id;
      nextStep = this.stepForLesson(pendingCurrentLesson);
    } else if (
      currentModule.finalAssessmentId &&
      !completedAssessmentsMap[currentModule.finalAssessmentId]
    ) {
      currentAssessmentId = currentModule.finalAssessmentId;
      nextStep = {
        type: "assessment",
        assessmentId: currentModule.finalAssessmentId,
      };
    } else {
      if (!completedModulesMap[currentModule.id]) {
        completedModulesMap[currentModule.id] = true;
        newlyCompletedModule = true;
      }

      let found = false;
      for (
        let index = currentModuleIndex + 1;
        index < modules.length;
        index++
      ) {
        const nextModule = modules[index];
        const nextLessons = lessonsByModule.get(nextModule.id) ?? [];
        const pending = nextLessons.find(
          (item) => !completedLessonsMap[item.id],
        );

        if (pending) {
          currentModuleId = nextModule.id;
          currentLessonId = pending.id;
          nextStep = this.stepForLesson(pending);
          found = true;
          break;
        }

        if (
          nextModule.finalAssessmentId &&
          !completedAssessmentsMap[nextModule.finalAssessmentId]
        ) {
          currentModuleId = nextModule.id;
          currentAssessmentId = nextModule.finalAssessmentId;
          nextStep = {
            type: "assessment",
            assessmentId: nextModule.finalAssessmentId,
          };
          found = true;
          break;
        }

        completedModulesMap[nextModule.id] = true;
      }

      if (!found) {
        currentModuleId = undefined;
        nextStep = { type: "complete" };
      }
    }

    if (nextStep === null) {
      throw flowError(
        500,
        "Não foi possível determinar a próxima etapa da matrícula.",
      );
    }

    const resolvedNextStep: LearningStep = nextStep;

    const counters = this.calculateProgress(
      modules,
      lessonsByModule,
      completedLessonsMap,
      completedAssessmentsMap,
    );
    const now = Timestamp.now();
    const completedModules = Object.keys(completedModulesMap).filter(
      (id) => completedModulesMap[id],
    ).length;
    const trailCompleted = resolvedNextStep.type === "complete";

    const update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> =
      {
        status: trailCompleted ? "concluido" : "matriculado",
        progress: trailCompleted ? 100 : counters.progress,
        completedLessons: counters.completedLessons,
        completedModules,
        completedAssessments: counters.completedAssessments,
        completedLessonsMap,
        completedModulesMap,
        completedAssessmentsMap,
        lastAccessAt: now,
        currentModuleId: currentModuleId ?? FieldValue.delete(),
        currentLessonId: currentLessonId ?? FieldValue.delete(),
        currentAssessmentId: currentAssessmentId ?? FieldValue.delete(),
        completedAt: trailCompleted ? now : FieldValue.delete(),
      };

    await db.collection(ENROLLMENTS).doc(enrollment.id).update(update);

    const updatedEnrollment: ExtendedEnrollment = {
      ...enrollment,
      status: trailCompleted ? "concluido" : "matriculado",
      progress: trailCompleted ? 100 : counters.progress,
      completedLessons: counters.completedLessons,
      completedModules,
      completedAssessments: counters.completedAssessments,
      completedLessonsMap,
      completedModulesMap,
      completedAssessmentsMap,
      lastAccessAt: now,
      ...(currentModuleId ? { currentModuleId } : {}),
      ...(currentLessonId ? { currentLessonId } : {}),
      ...(currentAssessmentId ? { currentAssessmentId } : {}),
      ...(trailCompleted ? { completedAt: now } : {}),
    };

    if (!currentModuleId) delete updatedEnrollment.currentModuleId;
    if (!currentLessonId) delete updatedEnrollment.currentLessonId;
    if (!currentAssessmentId) delete updatedEnrollment.currentAssessmentId;

    return {
      enrollment: updatedEnrollment,
      nextStep: resolvedNextStep,
      newlyCompletedLesson: !alreadyCompleted,
      newlyCompletedModule,
      newlyCompletedModuleId: newlyCompletedModule ? currentModule.id : undefined,
      trailCompleted,
      newlyCompletedTrail: trailCompleted && enrollment.status !== "concluido",
    };
  }

  static async completeContentLesson(input: {
    enrollmentId: string;
    userId: string;
    lessonId: string;
  }) {
    const enrollment = await this.getOwnedEnrollment(
      input.enrollmentId,
      input.userId,
    );
    if (enrollment.currentLessonId !== input.lessonId) {
      throw flowError(409, "Esta não é a aula atual da matrícula.");
    }

    const lesson = await this.getLesson(input.lessonId);
    if (lesson.version?.delivery === "practice") {
      throw flowError(
        409,
        "Esta etapa é prática e deve ser concluída pelo simulador.",
      );
    }
    await this.ensureLessonAssessmentPassed(lesson, enrollment);
    return this.finishLesson(enrollment, lesson);
  }

  static async completePractice(input: {
    enrollmentId: string;
    userId: string;
    lessonId: string;
    activityId: string;
    score?: number;
  }) {
    const enrollment = await this.getOwnedEnrollment(
      input.enrollmentId,
      input.userId,
    );
    if (enrollment.currentLessonId !== input.lessonId) {
      throw flowError(409, "Esta não é a prática atual da matrícula.");
    }

    const lesson = await this.getLesson(input.lessonId);
    const practice = lesson.version?.practice;
    if (lesson.version?.delivery !== "practice" || !practice) {
      throw flowError(409, "A aula não está configurada como prática.");
    }
    if (practice.targetId !== input.activityId) {
      throw flowError(
        400,
        "O simulador informado não corresponde à aula prática.",
      );
    }
    if (
      practice.completionMode === "minimum_score" &&
      (typeof input.score !== "number" ||
        input.score < (practice.minimumScore ?? 0))
    ) {
      throw flowError(
        422,
        `É necessário atingir pelo menos ${practice.minimumScore ?? 0}% para concluir a prática.`,
      );
    }

    await this.ensureLessonAssessmentPassed(lesson, enrollment);
    return this.finishLesson(enrollment, lesson);
  }

  static async recordPassedLessonAssessment(input: {
    enrollmentId: string;
    userId: string;
    assessmentId: string;
  }) {
    const enrollment = await this.getOwnedEnrollment(
      input.enrollmentId,
      input.userId,
    );
    const completedAssessmentsMap = {
      ...(enrollment.completedAssessmentsMap ?? {}),
      [input.assessmentId]: true as const,
    };
    await db.collection(ENROLLMENTS).doc(enrollment.id).update({
      completedAssessmentsMap,
      lastAccessAt: Timestamp.now(),
    });
    return { ...enrollment, completedAssessmentsMap };
  }

  static async completeModuleAssessment(input: {
    enrollmentId: string;
    userId: string;
    assessmentId: string;
  }): Promise<LearningFlowResult> {
    const enrollment = await this.getOwnedEnrollment(
      input.enrollmentId,
      input.userId,
    );
    if (enrollment.currentAssessmentId !== input.assessmentId) {
      throw flowError(409, "Esta não é a avaliação atual do módulo.");
    }
    if (!enrollment.currentModuleId) {
      throw flowError(409, "A matrícula não possui módulo atual.");
    }

    const { modules, lessonsByModule } = await this.getStructure(
      enrollment.trailId,
    );
    const currentModuleIndex = modules.findIndex(
      (module) => module.id === enrollment.currentModuleId,
    );
    if (currentModuleIndex < 0) {
      throw flowError(400, "O módulo atual não está disponível.");
    }

    const currentModule = modules[currentModuleIndex];
    if (currentModule.finalAssessmentId !== input.assessmentId) {
      throw flowError(
        409,
        "A avaliação não corresponde ao teste final do módulo.",
      );
    }

    const completedLessonsMap = { ...(enrollment.completedLessonsMap ?? {}) };
    const requiredLessons = lessonsByModule.get(currentModule.id) ?? [];
    if (requiredLessons.some((lesson) => !completedLessonsMap[lesson.id])) {
      throw flowError(
        409,
        "Conclua todas as aulas do módulo antes do teste final.",
      );
    }

    const completedAssessmentsMap: Record<string, true> = {
      ...(enrollment.completedAssessmentsMap ?? {}),
      [input.assessmentId]: true,
    };
    const completedModulesMap: Record<string, true> = {
      ...(enrollment.completedModulesMap ?? {}),
      [currentModule.id]: true,
    };

    let nextStep: LearningStep = { type: "complete" };
    let currentModuleId: string | undefined;
    let currentLessonId: string | undefined;
    let currentAssessmentId: string | undefined;

    for (let index = currentModuleIndex + 1; index < modules.length; index++) {
      const module = modules[index];
      const lessons = lessonsByModule.get(module.id) ?? [];
      const pendingLesson = lessons.find(
        (lesson) => !completedLessonsMap[lesson.id],
      );

      if (pendingLesson) {
        currentModuleId = module.id;
        currentLessonId = pendingLesson.id;
        nextStep = this.stepForLesson(pendingLesson);
        break;
      }

      if (
        module.finalAssessmentId &&
        !completedAssessmentsMap[module.finalAssessmentId]
      ) {
        currentModuleId = module.id;
        currentAssessmentId = module.finalAssessmentId;
        nextStep = {
          type: "assessment",
          assessmentId: module.finalAssessmentId,
        };
        break;
      }
      completedModulesMap[module.id] = true;
    }

    const counters = this.calculateProgress(
      modules,
      lessonsByModule,
      completedLessonsMap,
      completedAssessmentsMap,
    );
    const trailCompleted = nextStep.type === "complete";
    const now = Timestamp.now();
    const completedModules = Object.keys(completedModulesMap).length;

    await db
      .collection(ENROLLMENTS)
      .doc(enrollment.id)
      .update({
        status: trailCompleted ? "concluido" : "matriculado",
        progress: trailCompleted ? 100 : counters.progress,
        completedModules,
        completedLessons: counters.completedLessons,
        completedAssessments: counters.completedAssessments,
        completedLessonsMap,
        completedModulesMap,
        completedAssessmentsMap,
        currentModuleId: currentModuleId ?? FieldValue.delete(),
        currentLessonId: currentLessonId ?? FieldValue.delete(),
        currentAssessmentId: currentAssessmentId ?? FieldValue.delete(),
        completedAt: trailCompleted ? now : FieldValue.delete(),
        lastAccessAt: now,
      });

    const updated: ExtendedEnrollment = {
      ...enrollment,
      status: trailCompleted ? "concluido" : "matriculado",
      progress: trailCompleted ? 100 : counters.progress,
      completedModules,
      completedLessons: counters.completedLessons,
      completedAssessments: counters.completedAssessments,
      completedLessonsMap,
      completedModulesMap,
      completedAssessmentsMap,
      lastAccessAt: now,
      ...(currentModuleId ? { currentModuleId } : {}),
      ...(currentLessonId ? { currentLessonId } : {}),
      ...(currentAssessmentId ? { currentAssessmentId } : {}),
      ...(trailCompleted ? { completedAt: now } : {}),
    };
    if (!currentModuleId) delete updated.currentModuleId;
    if (!currentLessonId) delete updated.currentLessonId;
    if (!currentAssessmentId) delete updated.currentAssessmentId;

    return {
      enrollment: updated,
      nextStep,
      newlyCompletedAssessment:
        !enrollment.completedAssessmentsMap?.[input.assessmentId],
      newlyCompletedModule: !enrollment.completedModulesMap?.[currentModule.id],
      newlyCompletedModuleId: !enrollment.completedModulesMap?.[currentModule.id]
        ? currentModule.id
        : undefined,
      trailCompleted,
      newlyCompletedTrail: trailCompleted && enrollment.status !== "concluido",
    };
  }
}

export const getLearningFlowErrorStatus = (error: unknown) =>
  error instanceof Error &&
  "status" in error &&
  typeof (error as Error & { status?: unknown }).status === "number"
    ? (error as Error & { status: number }).status
    : 500;
