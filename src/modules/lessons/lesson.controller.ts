import { Request, Response } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ILesson2, ILessonVersion2, Lesson } from "./lesson.model";
import { extractBlocksText, IBlock } from "./block.types";
import { db } from "../../config/firebase";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { recordXpActivityAward, resolveXpAwardForUser } from "../xp-activity-rules/xp-activity-rule.service";
import { grantRewardsInTransaction, type GrantedReward } from "../rewards/reward.service";
import { syncUserBadges } from "../badges/badge-award.service";

const LESSONS_COLLECTION = "lessons";
const USER_LESSON_PROGRESS_COLLECTION = "userLessonProgress";
const LESSON_VERSIONS_COLLECTION = "versions";

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeAttachments = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        typeof item.url === "string",
    )
    .map((item: any) => ({
      name: item.name.trim(),
      url: item.url.trim(),
      type: typeof item.type === "string" ? item.type.trim() : undefined,
    }))
    .filter((item) => item.name && item.url);
};

export const getReadingTimeFromContent = (
  content: IBlock[],
  wordsPerMinute = 200,
): number => {
  const text = extractBlocksText(content);
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

export const createLesson = async (req: Request, res: Response) => {
  try {
    const {
      moduleId,
      sequence,
      createdBy,
      delivery = "content",
      practice,
      assessmentId,
      title = "Nova aula",
    } = req.body;

    if (!moduleId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "moduleId é obrigatório",
      });
    }

    if (sequence === undefined || sequence === null) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "sequence é obrigatório",
      });
    }

    const moduleRef = db.collection("modules").doc(moduleId);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Módulo não encontrado.",
      });
    }

    const module = moduleDoc.data();

    if (!module?.trailId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "O módulo não possui uma trilha vinculada.",
      });
    }

    const trailRef = db.collection("trails").doc(module.trailId);

    const lessonRef = db.collection(LESSONS_COLLECTION).doc();

    const versionRef = lessonRef.collection("versions").doc();

    const now = Timestamp.now();

    const lesson: ILesson2 = {
      id: lessonRef.id,
      moduleId,
      sequence,
      currentVersionId: versionRef.id,
      hasDraft: true,
      versionsCount: 1,
      status: "em_construcao",
      createdBy,
      createdAt: now,
      updatedAt: now,
      updatedBy: createdBy,
    };

    const initialContent: IBlock[] = [
      {
        id: crypto.randomUUID(),
        type: "Parágrafo",
        content:
          "👋 Bem-vindo ao editor da aula! Este é um rascunho inicial. Comece substituindo este texto pelo conteúdo da sua aula. Quando finalizar, publique a versão para que ela fique disponível aos alunos.",
      },
    ];

    const version: ILessonVersion2 = {
      id: versionRef.id,
      lessonId: lessonRef.id,
      version: 1,
      status: "rascunho",
      title,
      slug: "",
      summary: delivery === "practice" ? "Atividade prática" : "Resumo da aula",

      content: initialContent,

      type: delivery === "practice" ? "Simulação" : "Texto",
      tags: [],
      prerequisiteLessonIds: [],
      delivery: delivery === "practice" ? "practice" : "content",
      practice:
        delivery === "practice" && practice && typeof practice === "object"
          ? practice
          : undefined,
      assessmentId:
        typeof assessmentId === "string" && assessmentId.trim()
          ? assessmentId.trim()
          : undefined,

      durationInMinutes: getReadingTimeFromContent(initialContent),

      visibility: "privada",
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    if (!version.practice) delete version.practice;
    if (!version.assessmentId) delete version.assessmentId;

    const batch = db.batch();

    batch.set(lessonRef, lesson);

    batch.set(versionRef, version);

    batch.update(moduleRef, {
      totalLessons: FieldValue.increment(1),
      updatedAt: now,
      updatedBy: createdBy,
    });

    batch.update(trailRef, {
      totalLessons: FieldValue.increment(1),
      updatedAt: now,
      updatedBy: createdBy,
    });

    await batch.commit();

    return res.status(201).json({
      message: "Aula criada com sucesso.",
      lesson,
      version,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao criar aula.",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllLessons = async (_: Request, res: Response) => {
  try {
    const snapshot = await db.collection(LESSONS_COLLECTION).get();

    const lessons = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const lesson = {
          id: doc.id,
          ...(doc.data() as Omit<ILesson2, "id">),
        } as ILesson2;
        let version: ILessonVersion2 | null = null;
        if (lesson.currentVersionId) {
          const versionDoc = await db
            .collection(LESSONS_COLLECTION)
            .doc(lesson.id)
            .collection("versions")
            .doc(lesson.currentVersionId)
            .get();
          if (versionDoc.exists) {
            version = {
              id: versionDoc.id,
              ...(versionDoc.data() as Omit<ILessonVersion2, "id">),
            };
          }
        }
        return {
          ...lesson,
          version,
        };
      }),
    );

    console.log(lessons);

    return res.status(200).json(lessons);
  } catch (err) {
    console.error("Erro ao buscar aulas:", err);

    return res.status(500).json({
      message: "Erro ao buscar aulas.",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getLessonsByModule = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;
    const includeRestricted =
      String(req.query.includeRestricted ?? "false") === "true";

    const snapshot = await db
      .collection(LESSONS_COLLECTION)
      .where("moduleId", "==", moduleId)
      .orderBy("sequence", "asc")
      .get();

    let lessons = snapshot.docs.map((doc) =>
      Lesson.fromFirestore(doc.id, doc.data()),
    );

    if (!includeRestricted) {
      lessons = lessons.filter(
        (lesson) =>
          lesson.published &&
          !lesson.archived &&
          lesson.visibility !== "privada",
      );
    }

    return res.status(200).json(lessons.map((lesson) => lesson.toObject()));
  } catch (err) {
    console.error("Erro ao buscar aulas do módulo:", err);
    return res.status(500).json({
      message: "Erro ao buscar aulas do módulo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAccessibleLessonsByModule = async (
  req: Request,
  res: Response,
) => {
  try {
    const { moduleId } = req.params;
    const userId = String(req.query.userId ?? "");

    if (!userId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório",
      });
    }

    const [lessonsSnap, progressSnap] = await Promise.all([
      db
        .collection(LESSONS_COLLECTION)
        .where("moduleId", "==", moduleId)
        .orderBy("sequence", "asc")
        .get(),
      db
        .collection(USER_LESSON_PROGRESS_COLLECTION)
        .where("userId", "==", userId)
        .where("status", "==", "Concluída")
        .get(),
    ]);

    const allLessons = lessonsSnap.docs.map((doc) =>
      Lesson.fromFirestore(doc.id, doc.data()),
    );

    const completedLessonIds = progressSnap.docs.map((doc) =>
      String(doc.data().lessonId ?? ""),
    );

    const accessibleLessons = allLessons
      .filter(
        (lesson) =>
          lesson.published &&
          !lesson.archived &&
          lesson.visibility !== "privada" &&
          lesson.canUserAccess(completedLessonIds),
      )
      .map((lesson) => lesson.toObject());

    return res.status(200).json(accessibleLessons);
  } catch (err) {
    console.error("Erro ao buscar aulas acessíveis do módulo:", err);
    return res.status(500).json({
      message: "Erro ao buscar aulas acessíveis do módulo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getLessonById = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório",
      });
    }

    const userId = req.user.uid;

    if (!userId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório",
      });
    }

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Aula não encontrada" });
    }

    const data = doc.data();

    if (!data) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Dados da aula inválidos",
      });
    }

    const versionId = data.publishedVersionId ?? data.currentVersionId;

    if (!versionId) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "A aula não possui uma versão publicada.",
      });
    }

    const versionRef = lessonRef.collection("versions").doc(versionId);

    const versionDoc = await versionRef.get();

    if (!versionDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Versão atual da aula não encontrada",
      });
    }

    const version = {
      id: versionDoc.id,
      status: versionDoc.data()?.status,
      ...versionDoc.data(),
    };

    const lessonsSnap = await db
      .collection(LESSONS_COLLECTION)
      .where("moduleId", "==", data.moduleId)
      .where("status", "==", "disponivel")
      .get();

    const lessons = await Promise.all(
      lessonsSnap.docs.map(async (lessonDoc) => {
        const lesson = lessonDoc.data();
        const versionDoc = await lessonDoc.ref
          .collection("versions")
          .doc(lesson.currentVersionId)
          .get();
        return {
          id: lessonDoc.id,
          title: versionDoc.data()?.title,
        };
      }),
    );

    if (data.status !== "disponivel") {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Aula indisponível.",
      });
    }

    if (version.status !== "publicada") {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Versão da aula ainda não foi publicada.",
      });
    }

    const moduleDoc = await db.collection("modules").doc(data.moduleId).get();

    if (!moduleDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Módulo não encontrado.",
      });
    }

    const module = moduleDoc.data();

    if (module?.status !== "disponivel") {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Módulo indisponível.",
      });
    }

    const enrollmentSnap = await db
      .collection("enrollments")
      .where("userId", "==", userId)
      .where("trailId", "==", module.trailId)
      .limit(1)
      .get();

    if (enrollmentSnap.empty) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Você não está matriculado nesta trilha.",
      });
    }

    const enrollment = enrollmentSnap.docs[0].data();

    const isCurrentLesson = enrollment.currentLessonId === id;
    const isCompleted = enrollment.completedLessonsMap?.[id] === true;

    if (!isCurrentLesson && !isCompleted) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Esta aula ainda não está liberada para você.",
      });
    }

    return res.status(200).json({ lesson: { ...data, version }, lessons });
  } catch (err) {
    console.error("Erro ao buscar aula:", err);
    return res.status(500).json({
      message: "Erro ao buscar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy, publishNow } = req.body;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Aula não encontrada" });
    }

    const lesson = Lesson.fromFirestore(doc.id, doc.data()!);

    const content = Array.isArray(req.body.content)
      ? req.body.content
      : undefined;

    const readingTimeMinutes = content
      ? getReadingTimeFromContent(content)
      : undefined;

    lesson.update(
      {
        moduleId: req.body.moduleId,
        title: req.body.title,
        shortDescription: req.body.shortDescription,
        summary: req.body.summary,
        content: req.body.content,
        sequence: req.body.sequence,
        status: req.body.status,
        level: req.body.level,
        type: req.body.type,
        category: req.body.category,
        tags: Array.isArray(req.body.tags)
          ? normalizeStringArray(req.body.tags)
          : undefined,
        prerequisiteLessonIds: Array.isArray(req.body.prerequisiteLessonIds)
          ? normalizeStringArray(req.body.prerequisiteLessonIds)
          : undefined,
        videoUrl: req.body.videoUrl,
        thumbnailUrl: req.body.thumbnailUrl,
        attachments: Array.isArray(req.body.attachments)
          ? normalizeAttachments(req.body.attachments)
          : undefined,
        durationInMinutes: readingTimeMinutes,
        estimatedMinutes: readingTimeMinutes,
        readingTimeMinutes,
        published: req.body.published,
        visibility: req.body.visibility,
        featured: req.body.featured,
        responsibleInstructorId: req.body.responsibleInstructorId,
      },
      updatedBy,
    );

    if (publishNow === true) {
      lesson.publish(updatedBy);
    }

    await lessonRef.set(lesson.toObject(), { merge: true });

    return res.status(200).json({
      message: "Aula atualizada com sucesso",
      lesson: lesson.toObject(),
    });
  } catch (err) {
    console.error("Erro ao atualizar aula:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao atualizar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const publishLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const updatedBy = req.user.uid;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);

    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aula não encontrada.",
      });
    }

    const lesson = lessonDoc.data();

    if (!lesson?.currentVersionId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "A aula não possui uma versão atual.",
      });
    }

    const versionRef = lessonRef
      .collection(LESSON_VERSIONS_COLLECTION)
      .doc(lesson.currentVersionId);

    const versionDoc = await versionRef.get();

    if (!versionDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Versão da aula não encontrada.",
      });
    }

    const version = versionDoc.data();

    if (version?.status === "publicada") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Esta versão já está publicada.",
      });
    }

    const content: IBlock[] = Array.isArray(version?.content)
      ? version.content
      : [];

    const readingTimeMinutes = getReadingTimeFromContent(content);

    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
      transaction.update(versionRef, {
        status: "publicada",

        durationInMinutes: readingTimeMinutes,
        estimatedMinutes: readingTimeMinutes,
        readingTimeMinutes,

        publishedAt: now,
        updatedBy,
        updatedAt: now,
      });

      transaction.update(lessonRef, {
        status: "disponivel",

        publishedVersionId: versionRef.id,

        hasDraft: false,

        durationInMinutes: readingTimeMinutes,
        estimatedMinutes: readingTimeMinutes,
        readingTimeMinutes,

        updatedBy,
        updatedAt: now,
      });
    });

    return res.status(200).json({
      message: "Aula publicada com sucesso.",
      versionId: versionRef.id,
    });
  } catch (err) {
    console.error("Erro ao publicar aula:", err);

    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao publicar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const patchLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { createdBy, ...data } = req.body;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);

    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aula não encontrada",
      });
    }

    const currentLesson = doc.data();

    const updatedLesson = {
      ...currentLesson,
      ...data,
      updatedBy: createdBy,
      updatedAt: Timestamp.now(),
    };

    if (data.tags) {
      updatedLesson.tags = Array.isArray(data.tags)
        ? normalizeStringArray(data.tags)
        : currentLesson?.tags;
    }

    if (data.attachments) {
      updatedLesson.attachments = Array.isArray(data.attachments)
        ? normalizeAttachments(data.attachments)
        : currentLesson?.attachments;
    }

    if (Array.isArray(data.content)) {
      const readingTimeMinutes = getReadingTimeFromContent(data.content);

      updatedLesson.durationInMinutes = readingTimeMinutes;

      updatedLesson.estimatedMinutes = readingTimeMinutes;

      updatedLesson.readingTimeMinutes = readingTimeMinutes;
    }

    await lessonRef.set(updatedLesson, {
      merge: true,
    });

    return res.status(200).json({
      message: "Aula atualizada com sucesso",
      lesson: {
        id: doc.id,
        ...updatedLesson,
      },
    });
  } catch (err) {
    console.error("Erro ao atualizar aula:", err);

    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao atualizar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const patchDraft = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const {
      title,
      content,
      summary,
      type,
      tags,
      prerequisiteLessonIds,
      visibility,
      delivery,
      practice,
      assessmentId,
      updatedBy,
    } = req.body;

    const editableFields = {
      title,
      content,
      summary,
      type,
      tags,
      prerequisiteLessonIds,
      visibility,
      delivery,
      practice,
      assessmentId,
    };

    if (Object.values(editableFields).every((value) => value === undefined)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Informe ao menos um campo da versão para atualizar.",
      });
    }

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);

    const lessonSnap = await lessonRef.get();

    if (!lessonSnap.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aula não encontrada.",
      });
    }

    const lesson = lessonSnap.data();

    const now = Timestamp.now();

    if (!lesson?.currentVersionId) {
      const versionRef = lessonRef.collection(LESSON_VERSIONS_COLLECTION).doc();

      const draftContent: IBlock[] = Array.isArray(content) ? content : [];

      const duration = getReadingTimeFromContent(draftContent);

      const versionNumber = (lesson?.versionsCount ?? 0) + 1;

      await db.runTransaction(async (transaction) => {
        transaction.set(versionRef, {
          id: versionRef.id,
          lessonId: id,

          version: versionNumber,

          status: "rascunho",

          title: title ?? "Aula sem título",
          summary: summary ?? "",
          type: type ?? "Texto",
          tags: normalizeStringArray(tags),
          prerequisiteLessonIds: normalizeStringArray(prerequisiteLessonIds),
          visibility: visibility ?? "privada",
          delivery: delivery === "practice" ? "practice" : "content",
          practice: delivery === "practice" ? (practice ?? null) : null,
          assessmentId:
            typeof assessmentId === "string" && assessmentId.trim()
              ? assessmentId.trim()
              : null,

          content: draftContent,

          durationInMinutes: duration,

          estimatedMinutes: duration,

          readingTimeMinutes: duration,

          createdBy: updatedBy,
          updatedBy,

          createdAt: now,
          updatedAt: now,
        });

        transaction.update(lessonRef, {
          currentVersionId: versionRef.id,

          versionsCount: versionNumber,

          hasDraft: true,

          durationInMinutes: duration,

          estimatedMinutes: duration,

          readingTimeMinutes: duration,

          updatedBy,
          updatedAt: now,
        });
      });

      return res.status(200).json({
        message: "Nova versão criada com sucesso.",
        versionId: versionRef.id,
        version: versionNumber,
        created: true,
      });
    }

    const currentVersionRef = lessonRef
      .collection(LESSON_VERSIONS_COLLECTION)
      .doc(lesson.currentVersionId);

    const currentVersionSnap = await currentVersionRef.get();

    if (!currentVersionSnap.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Versão atual da aula não encontrada.",
      });
    }

    const currentVersion = currentVersionSnap.data();

    if (currentVersion?.status === "publicada") {
      const newVersionRef = lessonRef
        .collection(LESSON_VERSIONS_COLLECTION)
        .doc();

      const versionNumber = (lesson.versionsCount ?? 0) + 1;

      const draftContent: IBlock[] = Array.isArray(content)
        ? content
        : Array.isArray(currentVersion.content)
          ? currentVersion.content
          : [];

      const duration = getReadingTimeFromContent(draftContent);

      const newVersion = {
        ...currentVersion,

        id: newVersionRef.id,
        lessonId: id,

        version: versionNumber,

        status: "rascunho",

        title: title !== undefined ? title : currentVersion.title,
        summary: summary !== undefined ? summary : currentVersion.summary,
        type: type !== undefined ? type : currentVersion.type,
        tags:
          tags !== undefined
            ? normalizeStringArray(tags)
            : (currentVersion.tags ?? []),
        prerequisiteLessonIds:
          prerequisiteLessonIds !== undefined
            ? normalizeStringArray(prerequisiteLessonIds)
            : (currentVersion.prerequisiteLessonIds ?? []),
        visibility:
          visibility !== undefined ? visibility : currentVersion.visibility,
        delivery:
          delivery !== undefined
            ? delivery === "practice"
              ? "practice"
              : "content"
            : (currentVersion.delivery ?? "content"),
        practice:
          delivery === "content"
            ? null
            : practice !== undefined
              ? practice
              : (currentVersion.practice ?? null),
        assessmentId:
          assessmentId === null || assessmentId === ""
            ? null
            : assessmentId !== undefined
              ? assessmentId
              : (currentVersion.assessmentId ?? null),

        content: draftContent,

        durationInMinutes: duration,

        estimatedMinutes: duration,

        readingTimeMinutes: duration,

        publishedAt: null,

        createdBy: updatedBy,
        updatedBy,

        createdAt: now,
        updatedAt: now,
      };

      await db.runTransaction(async (transaction) => {
        transaction.set(newVersionRef, newVersion);

        transaction.update(lessonRef, {
          currentVersionId: newVersionRef.id,

          versionsCount: versionNumber,

          hasDraft: true,

          durationInMinutes: duration,

          estimatedMinutes: duration,

          readingTimeMinutes: duration,

          updatedBy,
          updatedAt: now,
        });
      });

      return res.status(200).json({
        message: "Nova versão de rascunho criada.",
        versionId: newVersionRef.id,
        version: versionNumber,
        created: true,
      });
    }

    const updateData: Record<string, unknown> = {
      updatedBy,
      updatedAt: now,
    };

    if (title !== undefined) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (type !== undefined) updateData.type = type;
    if (tags !== undefined) updateData.tags = normalizeStringArray(tags);
    if (prerequisiteLessonIds !== undefined) {
      updateData.prerequisiteLessonIds = normalizeStringArray(
        prerequisiteLessonIds,
      );
    }
    if (visibility !== undefined) updateData.visibility = visibility;
    if (delivery !== undefined) {
      updateData.delivery = delivery === "practice" ? "practice" : "content";
      if (delivery === "content") updateData.practice = FieldValue.delete();
    }
    if (practice !== undefined && delivery !== "content")
      updateData.practice = practice;
    if (assessmentId !== undefined) {
      updateData.assessmentId =
        assessmentId === null || assessmentId === ""
          ? FieldValue.delete()
          : assessmentId;
    }

    let readingTimeMinutes: number | undefined;

    if (content !== undefined) {
      updateData.content = content;

      if (Array.isArray(content)) {
        readingTimeMinutes = getReadingTimeFromContent(content);

        updateData.durationInMinutes = readingTimeMinutes;

        updateData.estimatedMinutes = readingTimeMinutes;

        updateData.readingTimeMinutes = readingTimeMinutes;
      }
    }

    await db.runTransaction(async (transaction) => {
      transaction.update(currentVersionRef, updateData);

      const lessonUpdate: Record<string, unknown> = {
        hasDraft: true,
        updatedBy,
        updatedAt: now,
      };

      if (readingTimeMinutes !== undefined) {
        lessonUpdate.durationInMinutes = readingTimeMinutes;

        lessonUpdate.estimatedMinutes = readingTimeMinutes;

        lessonUpdate.readingTimeMinutes = readingTimeMinutes;
      }

      transaction.update(lessonRef, lessonUpdate);
    });

    return res.status(200).json({
      message: "Rascunho atualizado com sucesso.",
      versionId: currentVersionRef.id,
      version: currentVersion?.version,
      created: false,
    });
  } catch (err) {
    console.error("Erro ao atualizar rascunho:", err);

    return res.status(500).json({
      message:
        err instanceof Error ? err.message : "Erro ao atualizar rascunho",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const unpublishLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Aula não encontrada" });
    }

    const lesson = Lesson.fromFirestore(doc.id, doc.data()!);
    lesson.unpublish(updatedBy);

    await lessonRef.set(lesson.toObject(), { merge: true });

    return res.status(200).json({
      message: "Aula despublicada com sucesso",
      lesson: lesson.toObject(),
    });
  } catch (err) {
    console.error("Erro ao despublicar aula:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao despublicar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const archiveLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Aula não encontrada" });
    }

    const lesson = Lesson.fromFirestore(doc.id, doc.data()!);
    lesson.archive(updatedBy);

    await lessonRef.set(lesson.toObject(), { merge: true });

    return res.status(200).json({
      message: "Aula arquivada com sucesso",
      lesson: lesson.toObject(),
    });
  } catch (err) {
    console.error("Erro ao arquivar aula:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao arquivar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const unarchiveLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Aula não encontrada" });
    }

    const lesson = Lesson.fromFirestore(doc.id, doc.data()!);
    lesson.unarchive(updatedBy);

    await lessonRef.set(lesson.toObject(), { merge: true });

    return res.status(200).json({
      message: "Aula desarquivada com sucesso",
      lesson: lesson.toObject(),
    });
  } catch (err) {
    console.error("Erro ao desarquivar aula:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao desarquivar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

import { IUserProgress } from "../users/user-progress.types";
import { calculateUpdatedStreak } from "../users/user-progress.controller";
import { ILevel } from "../levels/level.model";
import { recordHeatmapActivity } from "../../utils/record-heatmap-activity";

const LEGACY_LESSON_XP = 10;

export const completeLesson = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const { id } = req.params;
    const userId = req.user.uid;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);

    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aula não encontrada.",
      });
    }

    const completionRewardIds = normalizeStringArray(
      lessonDoc.data()?.completionRewardIds,
    );

    const progressQuery = await db
      .collection(USER_LESSON_PROGRESS_COLLECTION)
      .where("userId", "==", userId)
      .where("lessonId", "==", id)
      .limit(1)
      .get();

    if (!progressQuery.empty) {
      const existingProgress = progressQuery.docs[0].data();
      if (
        existingProgress.completed === true ||
        existingProgress.status === "Concluída"
      ) {
        return res.status(409).json({
          error: "CONFLICT",
          message: "Esta aula já foi concluída.",
          alreadyCompleted: true,
        });
      }
    }

    const userProgressRef = db.collection("user_progress").doc(userId);

    const userProgressDoc = await userProgressRef.get();

    if (!userProgressDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Progresso global do usuário não encontrado.",
      });
    }

    const userProgress = userProgressDoc.data() as IUserProgress;

    const { xp: lessonXp } = await resolveXpAwardForUser(
      "lesson_completed",
      LEGACY_LESSON_XP,
      userId,
      id,
    );

    const levelsSnapshot = await db.collection("levels").get();

    if (levelsSnapshot.empty) {
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Nenhum nível cadastrado.",
      });
    }

    const availableLevels: ILevel[] = levelsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          active: data.active === true || data.active === "true",
          featured: data.featured === true || data.featured === "true",
        } as ILevel;
      })
      .filter((level) => level.active)
      .sort((a, b) => a.levelNumber - b.levelNumber);

    if (!availableLevels.length) {
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Nenhum nível ativo cadastrado.",
      });
    }

    const oldTotalXp = userProgress.xp.total ?? 0;

    const oldLevelNumber = userProgress.level.current ?? 1;

    const newTotalXp = oldTotalXp + lessonXp;

    const currentLevel =
      [...availableLevels]
        .reverse()
        .find((level) => newTotalXp >= level.xpMin) ?? availableLevels[0];

    const currentLevelIndex = availableLevels.findIndex(
      (level) => level.levelNumber === currentLevel.levelNumber,
    );

    const nextLevel = availableLevels[currentLevelIndex + 1];

    const currentLevelXp = Math.max(0, newTotalXp - currentLevel.xpMin);

    const levelXpRange = nextLevel
      ? nextLevel.xpMin - currentLevel.xpMin
      : currentLevel.xpMax - currentLevel.xpMin;

    let progressPercent = 100;

    if (nextLevel && levelXpRange > 0) {
      progressPercent = Math.min(
        100,
        Number(((currentLevelXp / levelXpRange) * 100).toFixed(2)),
      );
    }

    const updatedLevels = [...(userProgress.levels ?? [])];

    const newlyUnlockedLevels = availableLevels.filter(
      (level) =>
        level.levelNumber > oldLevelNumber &&
        level.levelNumber <= currentLevel.levelNumber,
    );

    const reachedAt = new Date().toISOString();

    for (const level of newlyUnlockedLevels) {
      const alreadyExists = updatedLevels.some(
        (item) => item.level === level.levelNumber,
      );
      if (!alreadyExists) {
        updatedLevels.push({
          level: level.levelNumber,
          title: level.name,
          unlocked: true,
          reachedAt,
        });
      }
    }

    updatedLevels.sort((a, b) => a.level - b.level);

    const streakResult = calculateUpdatedStreak(userProgress);

    let grantedRewards: GrantedReward[] = [];
    await db.runTransaction(async (transaction) => {
      const progressSnapshot = await transaction.get(userProgressRef);
      if (!progressSnapshot.exists) throw new Error("PROGRESS_NOT_FOUND");
      const currentProgress = progressSnapshot.data() as IUserProgress;
      const rewardRequests = [
        ...availableLevels
          .filter((level) => level.levelNumber <= currentLevel.levelNumber)
          .flatMap((level) => (level.rewardIds ?? []).map((rewardId) => ({
            rewardId,
            source: { type: "level" as const, id: level.id ?? String(level.levelNumber) },
          }))),
        ...completionRewardIds.map((rewardId) => ({
          rewardId,
          source: { type: "lesson" as const, id },
        })),
      ];
      const rewardResult = await grantRewardsInTransaction(
        transaction,
        currentProgress,
        rewardRequests,
      );
      grantedRewards = rewardResult.granted;
      if (!progressQuery.empty) {
        transaction.set(
          progressQuery.docs[0].ref,
          {
            status: "Concluída",
            completed: true,
            progressPercent: 100,
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          },
          {
            merge: true,
          },
        );
      } else {
        const newProgressRef = db
          .collection(USER_LESSON_PROGRESS_COLLECTION)
          .doc();
        transaction.set(newProgressRef, {
          userId,
          lessonId: id,
          status: "Concluída",
          completed: true,
          progressPercent: 100,
          completedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      transaction.update(userProgressRef, {
        xp: {
          total: newTotalXp,
          currentLevelXp: !nextLevel
            ? Math.min(currentLevelXp, levelXpRange)
            : currentLevelXp,
          nextLevelXp: Math.max(levelXpRange, 0),
        },
        level: {
          current: currentLevel.levelNumber,
          currentTitle: currentLevel.name,
          progressPercent,
        },
        levels: updatedLevels,
        badges: rewardResult.progress.badges,
        rewards: rewardResult.progress.rewards,
        unlocked: rewardResult.progress.unlocked,
        streak: streakResult.streak,
        updatedAt: Timestamp.now(),
      });
    });

    const leveledUp = currentLevel.levelNumber > oldLevelNumber;
    const badgeResult = await syncUserBadges(userId);
    await recordXpActivityAward(userId, "lesson_completed", lessonXp, id);

    return res.status(200).json({
      message: "Aula marcada como concluída.",
      xp: {
        added: lessonXp,
        previous: oldTotalXp,
        current: newTotalXp,
      },
      levelUp: leveledUp,
      level: {
        previous: oldLevelNumber,
        current: currentLevel.levelNumber,
        title: currentLevel.name,
        progressPercent,
      },
      streak: {
        updated: streakResult.changed,
        ...streakResult.streak,
      },
      newlyUnlockedLevels: newlyUnlockedLevels.map((level) => ({
        id: level.id,
        levelNumber: level.levelNumber,
        name: level.name,
      })),
      rewards: grantedRewards,
      newlyUnlockedBadges: badgeResult.newlyUnlocked,
      progress: badgeResult.progress,
    });
  } catch (err) {
    console.error("Erro ao concluir aula:", err);

    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      message: "Erro ao concluir aula.",
    });
  }
};

export const startLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório",
      });
    }

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Aula não encontrada" });
    }

    const progressQuery = await db
      .collection(USER_LESSON_PROGRESS_COLLECTION)
      .where("userId", "==", userId)
      .where("lessonId", "==", id)
      .limit(1)
      .get();

    if (!progressQuery.empty) {
      const progressRef = progressQuery.docs[0].ref;
      await progressRef.set(
        {
          status: "Em andamento",
          startedAt: progressQuery.docs[0].data().startedAt ?? Timestamp.now(),
          lastAccessAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    } else {
      await db.collection(USER_LESSON_PROGRESS_COLLECTION).add({
        userId,
        lessonId: id,
        status: "Em andamento",
        progressPercent: 0,
        startedAt: Timestamp.now(),
        lastAccessAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    recordHeatmapActivity(userId);

    return res.status(200).json({
      message: "Aula iniciada com sucesso",
    });
  } catch (err) {
    console.error("Erro ao iniciar aula:", err);
    return res.status(500).json({
      message: "Erro ao iniciar aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);
    const doc = await lessonRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Aula não encontrada" });
    }

    await lessonRef.delete();

    return res.status(200).json({
      message: "Aula excluída com sucesso",
    });
  } catch (err) {
    console.error("Erro ao excluir aula:", err);
    return res.status(500).json({
      message: "Erro ao excluir aula",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getLessonVersions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);

    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aula não encontrada.",
      });
    }

    const lesson = lessonDoc.data();

    const versionsSnapshot = await lessonRef
      .collection(LESSON_VERSIONS_COLLECTION)
      .orderBy("version", "desc")
      .get();

    const versions: ILessonVersion2[] = versionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ILessonVersion2, "id">),
    }));

    const fallbackPublishedVersion = versions.find(
      (version) => version.status === "publicada",
    );

    return res.status(200).json({
      versions,

      lesson: {
        id: lessonDoc.id,

        currentVersionId: lesson?.currentVersionId,

        publishedVersionId:
          lesson?.publishedVersionId ?? fallbackPublishedVersion?.id,

        versionsCount: versions.length,

        hasDraft: versions.some(
          (version) =>
            version.status === "rascunho" &&
            version.id === lesson?.currentVersionId,
        ),
      },
    });
  } catch (err) {
    console.error("Erro ao buscar versões:", err);

    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao buscar versões.",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const restoreLessonVersion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }

    const { id, versionId } = req.params;
    const updatedBy = req.user.uid;

    const lessonRef = db.collection(LESSONS_COLLECTION).doc(id);

    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Aula não encontrada.",
      });
    }

    const lesson = lessonDoc.data();

    const sourceVersionRef = lessonRef
      .collection(LESSON_VERSIONS_COLLECTION)
      .doc(versionId);

    const sourceVersionDoc = await sourceVersionRef.get();

    if (!sourceVersionDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Versão não encontrada.",
      });
    }

    const sourceVersion = sourceVersionDoc.data();

    const newVersionRef = lessonRef
      .collection(LESSON_VERSIONS_COLLECTION)
      .doc();

    const versionNumber = (lesson?.versionsCount ?? 0) + 1;

    const content: IBlock[] = Array.isArray(sourceVersion?.content)
      ? sourceVersion.content
      : [];

    const readingTimeMinutes = getReadingTimeFromContent(content);

    const now = Timestamp.now();

    const newVersion: ILessonVersion2 = {
      ...(sourceVersion as ILessonVersion2),

      id: newVersionRef.id,
      lessonId: id,

      version: versionNumber,

      status: "rascunho",

      content,

      durationInMinutes: readingTimeMinutes,

      createdBy: updatedBy,
      createdAt: now,
      updatedAt: now,
    };

    delete (newVersion as Partial<ILessonVersion2>).publishedAt;

    await db.runTransaction(async (transaction) => {
      transaction.set(newVersionRef, newVersion);

      transaction.update(lessonRef, {
        currentVersionId: newVersionRef.id,

        versionsCount: versionNumber,

        hasDraft: true,

        durationInMinutes: readingTimeMinutes,

        estimatedMinutes: readingTimeMinutes,

        readingTimeMinutes: readingTimeMinutes,

        updatedBy,
        updatedAt: now,
      });
    });

    return res.status(201).json({
      message: `Nova versão criada a partir da versão ${sourceVersion?.version ?? ""}.`,

      version: newVersion,
    });
  } catch (err) {
    console.error("Erro ao restaurar versão:", err);

    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao restaurar versão.",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
