import { db } from "../config/firebase";
import type {
  ITrailAdminAnalytics,
  ITrailActivityUsage,
  ITrailAnalyticsNamedMetric,
  ITrailAuditItem,
  ITrailErrorContent,
  ITrailModuleFunnel,
} from "../interfaces/trail.analytics.interface";

const DAY_MS = 86_400_000;

const INACTIVITY_DAYS =
  Number(process.env.TRAIL_INACTIVITY_DAYS) > 0
    ? Number(process.env.TRAIL_INACTIVITY_DAYS)
    : 14;

type AnyRecord = Record<string, any>;

export const timestampToMillis = (value: unknown): number | null => {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (value instanceof Date) return value.getTime();

  if (typeof value === "string") {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    const seconds = object._seconds ?? object.seconds;

    if (seconds !== undefined) {
      const parsed = Number(seconds);
      return Number.isFinite(parsed) ? parsed * 1000 : null;
    }
  }

  return null;
};

const normalizeStatus = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const uniqueUsers = (items: AnyRecord[]) =>
  new Set(
    items
      .map((item) => String(item.userId ?? "").trim())
      .filter(Boolean),
  ).size;

const percentage = (part: number, total: number) =>
  total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;

const average = (values: number[]): number | null => {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2));
};

const maxMetric = (
  source: Map<string, number>,
  names: Map<string, string>,
): ITrailAnalyticsNamedMetric | null => {
  if (!source.size) return null;

  const [id, value] = [...source.entries()].sort((a, b) => b[1] - a[1])[0];
  return { id, name: names.get(id) ?? id, value };
};

const isValidStoredUrl = (value: string) => {
  const url = value.trim();
  if (!url) return true;

  return (
    /^https?:\/\//i.test(url) ||
    /^data:/i.test(url) ||
    /^blob:/i.test(url) ||
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("../")
  );
};

const countInvalidUrls = (value: unknown, keyName = ""): number => {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countInvalidUrls(item, keyName), 0);
  }

  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      /(url|src|href)$/i.test(keyName) &&
      value.trim() &&
      !isValidStoredUrl(value)
    ) {
      return 1;
    }

    return 0;
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (total, [key, nested]) => total + countInvalidUrls(nested, key),
    0,
  );
};

const getEventActivity = (event: AnyRecord) => {
  const type = String(event.type ?? "");

  if (type === "game_completed") {
    return {
      id: String(event.gameId ?? "").trim(),
      name: String(event.gameName ?? event.gameId ?? "Jogo"),
      type: "game" as const,
    };
  }

  if (type === "simulation_completed") {
    return {
      id: String(event.simulatorId ?? "").trim(),
      name: String(event.simulatorName ?? event.simulatorId ?? "Simulador"),
      type: "simulation" as const,
    };
  }

  if (type === "lesson_completed") {
    return {
      id: String(event.lessonId ?? "").trim(),
      name: String(event.lessonName ?? event.lessonId ?? "Aula"),
      type: "lesson" as const,
    };
  }

  return null;
};

const resolveAuditActors = async (
  auditItems: AnyRecord[],
  extraUserIds: string[] = [],
) => {
  const actorIds = [
    ...new Set([
      ...auditItems
        .map((item) => String(item.actorId ?? "").trim())
        .filter(Boolean),
      ...extraUserIds.map((id) => String(id ?? "").trim()).filter(Boolean),
    ]),
  ];

  const actorNames = new Map<string, string>();
  if (!actorIds.length) return actorNames;

  const refs = actorIds.map((id) => db.collection("users").doc(id));
  const docs = await db.getAll(...refs);

  docs.forEach((doc) => {
    if (!doc.exists) return;
    const data = doc.data() ?? {};
    actorNames.set(
      doc.id,
      String(data.name ?? data.displayName ?? data.username ?? data.email ?? doc.id),
    );
  });

  return actorNames;
};

const collectActivityReferences = (modules: AnyRecord[]) => {
  const references: { id: string; collection: "games" }[] = [];

  for (const module of modules) {
    const ids = [
      ...(Array.isArray(module.gameIds) ? module.gameIds : []),
      ...(Array.isArray(module.quizIds) ? module.quizIds : []),
      ...(Array.isArray(module.activityIds) ? module.activityIds : []),
    ];

    for (const rawId of ids) {
      const id = String(rawId ?? "").trim();
      if (id) references.push({ id, collection: "games" });
    }
  }

  return references;
};

export class TrailAnalyticsService {
  async getAnalytics(trailId: string): Promise<ITrailAdminAnalytics> {
    if (!trailId?.trim()) throw new Error("trailId é obrigatório.");

    const trailRef = db.collection("trails").doc(trailId);
    const trailDoc = await trailRef.get();

    if (!trailDoc.exists) {
      throw Object.assign(new Error("Trilha não encontrada."), { status: 404 });
    }

    const trail = { id: trailDoc.id, ...(trailDoc.data() ?? {}) } as AnyRecord;

    const [
      modulesSnapshot,
      enrollmentsSnapshot,
      certificatesSnapshot,
      eventsSnapshot,
      feedbackSnapshot,
      auditSnapshot,
    ] = await Promise.all([
      db.collection("modules").where("trailId", "==", trailId).get(),
      db.collection("enrollments").where("trailId", "==", trailId).get(),
      db.collection("certificates").where("trailId", "==", trailId).get(),
      db.collection("learning_events").where("trailId", "==", trailId).get(),
      db.collection("trail_feedback").where("trailId", "==", trailId).get(),
      db.collection("admin_audit_logs").where("trailId", "==", trailId).get(),
    ]);

    const modules = modulesSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort(
        (a, b) =>
          Number((a as AnyRecord).sequence ?? (a as AnyRecord).order ?? 0) -
          Number((b as AnyRecord).sequence ?? (b as AnyRecord).order ?? 0),
      ) as AnyRecord[];

    const lessonsByModule = new Map<string, AnyRecord[]>();

    await Promise.all(
      modules.map(async (module) => {
        const snapshot = await db
          .collection("lessons")
          .where("moduleId", "==", module.id)
          .get();

        const lessons = await Promise.all(
          snapshot.docs.map(async (lessonDoc) => {
            const lesson = { id: lessonDoc.id, ...lessonDoc.data() } as AnyRecord;
            let version: AnyRecord | null = null;

            if (lesson.currentVersionId) {
              const versionDoc = await lessonDoc.ref
                .collection("versions")
                .doc(String(lesson.currentVersionId))
                .get();

              if (versionDoc.exists) {
                version = { id: versionDoc.id, ...versionDoc.data() };
              }
            }

            return { ...lesson, version };
          }),
        );

        lessonsByModule.set(module.id, lessons);
      }),
    );

    const lessons = modules.flatMap((module) => lessonsByModule.get(module.id) ?? []);
    const enrollments = enrollmentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AnyRecord[];
    const events = eventsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AnyRecord[];
    const feedback = feedbackSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AnyRecord[];
    const audit = auditSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AnyRecord[];

    const activeEnrollments = enrollments.filter((item) => {
      const status = normalizeStatus(item.status);
      return status === "matriculado" || status === "em_andamento";
    });

    const completedEnrollments = enrollments.filter(
      (item) => normalizeStatus(item.status) === "concluido",
    );

    const cancelledEnrollments = enrollments.filter(
      (item) => normalizeStatus(item.status) === "cancelado",
    );

    const completedUsers = uniqueUsers(completedEnrollments);
    const enrollmentsTotal = enrollments.length;
    const enrollmentsActive = activeEnrollments.length;
    const inProgressUsers = uniqueUsers(activeEnrollments);

    const averageProgress = activeEnrollments.length
      ? Number(
          (
            activeEnrollments.reduce(
              (total, item) => total + Number(item.progress ?? 0),
              0,
            ) / activeEnrollments.length
          ).toFixed(1),
        )
      : 0;

    const inactivityLimit = Date.now() - INACTIVITY_DAYS * DAY_MS;
    const inactiveEnrollments = activeEnrollments.filter((item) => {
      const access = timestampToMillis(item.lastAccessAt);
      return !access || access < inactivityLimit;
    });

    const inactiveUsers = uniqueUsers(inactiveEnrollments);

    const completionTimes = completedEnrollments
      .map((item) => {
        const started = timestampToMillis(item.startedAt ?? item.createdAt);
        const finished = timestampToMillis(item.completedAt);
        return started && finished && finished >= started ? finished - started : null;
      })
      .filter((value): value is number => value !== null);

    const averageCompletionTimeMinutes = completionTimes.length
      ? Math.round(
          completionTimes.reduce((sum, value) => sum + value, 0) /
            completionTimes.length /
            60_000,
        )
      : null;

    const moduleNames = new Map(
      modules.map((module) => [
        module.id,
        String(module.title ?? module.name ?? "Módulo sem nome"),
      ]),
    );
    const lessonNames = new Map(
      lessons.map((lesson) => [
        lesson.id,
        String(lesson.version?.title ?? lesson.title ?? "Aula sem título"),
      ]),
    );

    const moduleDropMap = new Map<string, number>();
    const lessonDropMap = new Map<string, number>();

    inactiveEnrollments.forEach((item) => {
      if (item.currentModuleId) {
        const id = String(item.currentModuleId);
        moduleDropMap.set(id, (moduleDropMap.get(id) ?? 0) + 1);
      }

      if (item.currentLessonId) {
        const id = String(item.currentLessonId);
        lessonDropMap.set(id, (lessonDropMap.get(id) ?? 0) + 1);
      }
    });

    const lessonCompletionMap = new Map<string, number>();
    enrollments.forEach((enrollment) => {
      Object.entries(enrollment.completedLessonsMap ?? {}).forEach(
        ([lessonId, completed]) => {
          if (!completed) return;
          lessonCompletionMap.set(
            lessonId,
            (lessonCompletionMap.get(lessonId) ?? 0) + 1,
          );
        },
      );
    });

    const lessonRanking = lessons
      .map((lesson) => ({
        id: lesson.id,
        name: lessonNames.get(lesson.id) ?? lesson.id,
        value: lessonCompletionMap.get(lesson.id) ?? 0,
      }))
      .sort((a, b) => b.value - a.value);

    const mostCompletedLesson = lessonRanking[0] ?? null;
    const leastCompletedLesson = lessonRanking.length
      ? lessonRanking[lessonRanking.length - 1]
      : null;

    const moduleFunnel: ITrailModuleFunnel[] = modules.map((module, index) => {
      const reached = enrollments.filter((enrollment) => {
        if (normalizeStatus(enrollment.status) === "concluido") return true;
        if (enrollment.completedModulesMap?.[module.id]) return true;

        const currentIndex = modules.findIndex(
          (item) => item.id === String(enrollment.currentModuleId ?? ""),
        );

        return currentIndex >= index;
      }).length;

      return {
        moduleId: module.id,
        title: moduleNames.get(module.id) ?? "Módulo",
        sequence: index + 1,
        usersReached: reached,
        percentage: percentage(reached, enrollmentsTotal),
      };
    });

    const blockedUsers = new Set(
      events
        .filter((event) => event.type === "trail_blocked")
        .map((event) => String(event.userId ?? "").trim())
        .filter(Boolean),
    ).size;

    const ratings = feedback
      .map((item) => Number(item.rating))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

    const createdById = trail.createdBy ? String(trail.createdBy) : "";
    const updatedById = trail.updatedBy ? String(trail.updatedBy) : "";

    /*
     * Para registros antigos, anteriores ao admin_audit_logs, criamos
     * entradas sintéticas de criação/última atualização a partir dos
     * timestamps atuais. Elas não inventam valores anteriores; apenas
     * tornam módulos e aulas legados visíveis na linha do tempo.
     */
    const syntheticAudit: AnyRecord[] = [];
    const hasAudit = (entityType: string, entityId: string, action: string) =>
      audit.some(
        (item) =>
          String(item.entityType ?? "") === entityType &&
          String(item.entityId ?? "") === entityId &&
          String(item.action ?? "") === action,
      );

    const pushSyntheticEntityAudit = (
      entity: AnyRecord,
      entityType: "trail" | "module" | "lesson",
      createdAction: string,
      updatedAction: string,
    ) => {
      const entityId = String(entity.id ?? "").trim();
      if (!entityId) return;

      const createdAt = entity.createdAt;
      const updatedAt = entity.updatedAt;
      const createdMillis = timestampToMillis(createdAt);
      const updatedMillis = timestampToMillis(updatedAt);

      if (createdAt && !hasAudit(entityType, entityId, createdAction)) {
        syntheticAudit.push({
          id: `legacy:${entityType}:${entityId}:created`,
          action: createdAction,
          entityType,
          entityId,
          actorId: entity.createdBy ?? null,
          changes: [],
          createdAt,
          synthetic: true,
        });
      }

      if (
        updatedAt &&
        updatedMillis &&
        (!createdMillis || updatedMillis > createdMillis + 1000) &&
        !hasAudit(entityType, entityId, updatedAction)
      ) {
        syntheticAudit.push({
          id: `legacy:${entityType}:${entityId}:updated`,
          action: updatedAction,
          entityType,
          entityId,
          actorId: entity.updatedBy ?? entity.createdBy ?? null,
          changes: [],
          createdAt: updatedAt,
          synthetic: true,
        });
      }
    };

    pushSyntheticEntityAudit(trail, "trail", "trail_created", "trail_updated");
    modules.forEach((module) =>
      pushSyntheticEntityAudit(module, "module", "module_created", "module_updated"),
    );
    lessons.forEach((lesson) =>
      pushSyntheticEntityAudit(lesson, "lesson", "lesson_created", "lesson_updated"),
    );

    const allAudit = [...audit, ...syntheticAudit];
    const extraActorIds = [
      createdById,
      updatedById,
      ...modules.flatMap((module) => [module.createdBy, module.updatedBy]),
      ...lessons.flatMap((lesson) => [lesson.createdBy, lesson.updatedBy]),
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

    const actorNames = await resolveAuditActors(allAudit, extraActorIds);
    const mappedAudit: ITrailAuditItem[] = allAudit
      .map((item) => ({
        id: String(item.id),
        action: String(item.action ?? "trail_updated"),
        entityType: (item.entityType ?? "trail") as ITrailAuditItem["entityType"],
        entityId: String(item.entityId ?? trailId),
        actorId: item.actorId ? String(item.actorId) : null,
        actorName: item.actorId
          ? actorNames.get(String(item.actorId)) ?? String(item.actorId)
          : null,
        synthetic: item.synthetic === true,
        changes: Array.isArray(item.changes) ? item.changes : [],
        createdAt: item.createdAt,
      }))
      .sort(
        (a, b) =>
          (timestampToMillis(b.createdAt) ?? 0) -
          (timestampToMillis(a.createdAt) ?? 0),
      );

    const publicationHistory = mappedAudit.filter((item) =>
      ["trail_published", "trail_unpublished", "trail_status_changed"].includes(
        item.action,
      ),
    );

    const prerequisiteIds = Array.isArray(trail.prerequisiteTrailIds)
      ? trail.prerequisiteTrailIds.map(String).filter(Boolean)
      : [];

    const prerequisiteDocs = await Promise.all(
      prerequisiteIds.map((id: string) => db.collection("trails").doc(id).get()),
    );
    const invalidPrerequisites = prerequisiteDocs.filter((doc) => !doc.exists).length;

    const activityReferences = collectActivityReferences(modules);
    const activityDocs = await Promise.all(
      activityReferences.map((ref) => db.collection(ref.collection).doc(ref.id).get()),
    );
    const nonexistentActivities = activityDocs.filter((doc) => !doc.exists).length;

    const gameNames = new Map<string, string>();
    activityDocs.forEach((doc) => {
      if (!doc.exists) return;
      const data = doc.data() ?? {};
      gameNames.set(doc.id, String(data.name ?? data.title ?? doc.id));
    });

    const referencedGameIds = [
      ...new Set(activityReferences.map((item) => item.id)),
    ];

    const enrolledUserIds = new Set(
      enrollments
        .map((item) => String(item.userId ?? "").trim())
        .filter(Boolean),
    );

    const gameIdsAlreadyTracked = new Set(
      events
        .filter((event) => event.type === "game_completed")
        .map((event) => String(event.gameId ?? "").trim())
        .filter(Boolean),
    );

    /*
     * Fallback para histórico legado: usa game_history somente para jogos
     * que ainda não possuem learning_events contextualizados nesta trilha.
     * Também restringe aos usuários matriculados para reduzir atribuições
     * indevidas quando o mesmo jogo é reutilizado em mais de uma trilha.
     */
    const legacyGameIds = referencedGameIds.filter(
      (gameId) => !gameIdsAlreadyTracked.has(gameId),
    );

    const gameHistory: AnyRecord[] = [];
    for (let index = 0; index < legacyGameIds.length; index += 10) {
      const chunk = legacyGameIds.slice(index, index + 10);
      if (!chunk.length) continue;

      const snapshot = await db
        .collection("game_history")
        .where("gameId", "in", chunk)
        .get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const userId = String(data.userId ?? "").trim();
        if (enrolledUserIds.size && !enrolledUserIds.has(userId)) return;

        gameHistory.push({
          id: doc.id,
          ...data,
          type: "game_completed",
          gameName: data.gameName ?? gameNames.get(String(data.gameId ?? "")),
        });
      });
    }

    const analyticsEvents = [...events, ...gameHistory];

    const eventXp = analyticsEvents.reduce(
      (sum, event) => sum + (Number(event.xpAwarded) || 0),
      0,
    );
    const enrollmentXp = enrollments.reduce(
      (sum, enrollment) => sum + (Number(enrollment.xp) || 0),
      0,
    );
    const totalXpGenerated = enrollmentXp > 0 ? enrollmentXp : eventXp;
    const averageXpGenerated = enrollmentsTotal
      ? Math.round(totalXpGenerated / enrollmentsTotal)
      : 0;

    const activityUsage = new Map<
      string,
      { id: string; name: string; type: ITrailActivityUsage["type"]; uses: number }
    >();

    const attemptGroups = new Map<string, number>();
    const errorGroups = new Map<
      string,
      {
        id: string;
        name: string;
        type: ITrailErrorContent["type"];
        attempts: number;
        correctAnswers: number;
        wrongAnswers: number;
      }
    >();

    const scoreValues: number[] = [];
    const accuracyValues: number[] = [];

    for (const event of analyticsEvents) {
      const activity = getEventActivity(event);
      if (!activity?.id) continue;

      const usageKey = `${activity.type}:${activity.id}`;
      const usage = activityUsage.get(usageKey) ?? { ...activity, uses: 0 };
      usage.uses += 1;
      activityUsage.set(usageKey, usage);

      const userId = String(event.userId ?? "anon");
      const attemptKey = `${userId}:${usageKey}`;
      attemptGroups.set(attemptKey, (attemptGroups.get(attemptKey) ?? 0) + 1);

      if (event.score !== null && event.score !== undefined) {
        const score = Number(event.score);
        if (Number.isFinite(score)) scoreValues.push(score);
      }

      const correct = Number(event.correctAnswers);
      const total = Number(event.totalAnswers);

      if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
        accuracyValues.push((correct / total) * 100);

        const error = errorGroups.get(usageKey) ?? {
          ...activity,
          attempts: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
        };

        error.attempts += 1;
        error.correctAnswers += correct;
        error.wrongAnswers += Math.max(0, total - correct);
        errorGroups.set(usageKey, error);
      }
    }

    const mostUsedActivities = [...activityUsage.values()]
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10);

    const attemptValues = [...attemptGroups.values()];
    const averageAttempts = attemptValues.length ? average(attemptValues) : null;

    const highestErrorContent =
      [...errorGroups.values()]
        .map((item) => {
          const totalAnswers = item.correctAnswers + item.wrongAnswers;
          return {
            ...item,
            errorRate: totalAnswers
              ? Number(((item.wrongAnswers / totalAnswers) * 100).toFixed(1))
              : 0,
          };
        })
        .sort((a, b) => b.errorRate - a.errorRate)[0] ?? null;

    const modulesWithoutLessons = modules.filter(
      (module) => !(lessonsByModule.get(module.id) ?? []).length,
    ).length;

    const lessonsWithoutPublishedVersion = lessons.filter((lesson) => {
      const lessonStatus = normalizeStatus(lesson.status);
      const versionStatus = normalizeStatus(lesson.version?.status);

      return (
        !lesson.currentVersionId ||
        !lesson.version ||
        lessonStatus !== "disponivel" ||
        !["publicado", "publicada", "disponivel"].includes(versionStatus)
      );
    }).length;

    const invalidUrls = countInvalidUrls({
      thumbnailUrl: trail.thumbnailUrl,
      modules,
      lessons,
    });

    const warnings: string[] = [];
    if (!modules.length) warnings.push("A trilha não possui módulos.");
    if (modulesWithoutLessons)
      warnings.push(`${modulesWithoutLessons} módulo(s) sem aulas.`);
    if (lessonsWithoutPublishedVersion)
      warnings.push(
        `${lessonsWithoutPublishedVersion} aula(s) sem versão publicada/disponível.`,
      );
    if (invalidPrerequisites)
      warnings.push(`${invalidPrerequisites} pré-requisito(s) inválido(s).`);
    if (nonexistentActivities)
      warnings.push(`${nonexistentActivities} atividade(s) referenciada(s) não existe(m).`);
    if (invalidUrls) warnings.push(`${invalidUrls} URL(s) armazenada(s) inválida(s).`);

    let baseProblems = 0;
    if (!String(trail.title ?? "").trim()) baseProblems += 1;
    if (!String(trail.description ?? "").trim()) baseProblems += 1;
    if (!String(trail.status ?? "").trim()) baseProblems += 1;
    if (!String(trail.level ?? "").trim()) baseProblems += 1;
    if (!modules.length) baseProblems += 1;

    const problems =
      baseProblems +
      modulesWithoutLessons +
      lessonsWithoutPublishedVersion +
      invalidPrerequisites +
      nonexistentActivities +
      invalidUrls;

    const checks = Math.max(
      5,
      5 +
        modules.length +
        lessons.length +
        prerequisiteIds.length +
        activityReferences.length,
    );

    const configurationPercent = Math.max(
      0,
      Math.min(100, Math.round(100 - (problems / checks) * 100)),
    );

    const now = Date.now();
    const ago7 = now - 7 * DAY_MS;
    const ago30 = now - 30 * DAY_MS;
    const previous30 = now - 60 * DAY_MS;

    const enrollmentStartedAt = (item: AnyRecord) =>
      timestampToMillis(item.startedAt ?? item.createdAt) ?? 0;

    const completions7d = completedEnrollments.filter(
      (item) => (timestampToMillis(item.completedAt) ?? 0) >= ago7,
    ).length;
    const completions30d = completedEnrollments.filter(
      (item) => (timestampToMillis(item.completedAt) ?? 0) >= ago30,
    ).length;
    const newEnrollments7d = enrollments.filter(
      (item) => enrollmentStartedAt(item) >= ago7,
    ).length;
    const newEnrollments30d = enrollments.filter(
      (item) => enrollmentStartedAt(item) >= ago30,
    ).length;

    const eventDates = analyticsEvents
      .map((item) => timestampToMillis(item.createdAt ?? item.completedAt))
      .filter((value): value is number => value !== null);

    const fallbackDates = enrollments.flatMap((item) =>
      [item.startedAt ?? item.createdAt, item.lastAccessAt, item.completedAt]
        .map(timestampToMillis)
        .filter((value): value is number => value !== null),
    );

    const trendDates = eventDates.length ? eventDates : fallbackDates;
    const currentPeriod = trendDates.filter((date) => date >= ago30).length;
    const previousPeriod = trendDates.filter(
      (date) => date >= previous30 && date < ago30,
    ).length;

    const difference =
      previousPeriod > 0
        ? ((currentPeriod - previousPeriod) / previousPeriod) * 100
        : currentPeriod > 0
          ? 100
          : 0;

    const allActivityDates = [
      ...analyticsEvents.map((item) =>
        timestampToMillis(item.createdAt ?? item.completedAt),
      ),
      ...enrollments.map((item) => timestampToMillis(item.lastAccessAt)),
    ].filter((value): value is number => value !== null);

    const lastActivityMillis = allActivityDates.length
      ? Math.max(...allActivityDates)
      : null;

    const contentUpdatedDates = [
      timestampToMillis(trail.updatedAt ?? trail.createdAt),
      ...modules.map((module) => timestampToMillis(module.updatedAt ?? module.createdAt)),
      ...lessons.map((lesson) => timestampToMillis(lesson.updatedAt ?? lesson.createdAt)),
    ].filter((value): value is number => value !== null);

    const effectiveUpdatedAt = contentUpdatedDates.length
      ? new Date(Math.max(...contentUpdatedDates)).toISOString()
      : trail.updatedAt ?? trail.createdAt ?? null;

    return {
      enrollmentsTotal,
      enrollmentsActive,
      completedUsers,
      cancelledEnrollments: cancelledEnrollments.length,
      completionRate: percentage(completedUsers, enrollmentsTotal),
      averageProgress,

      inactiveUsers,
      inactivityRate: percentage(inactiveUsers, inProgressUsers),
      inactivityDaysThreshold: INACTIVITY_DAYS,

      averageCompletionTimeMinutes,
      lastActivityAt: lastActivityMillis
        ? new Date(lastActivityMillis).toISOString()
        : null,

      mostDroppedModule: maxMetric(moduleDropMap, moduleNames),
      mostDroppedLesson: maxMetric(lessonDropMap, lessonNames),
      mostCompletedLesson,
      leastCompletedLesson,
      moduleFunnel,

      certificatesIssued: certificatesSnapshot.size,
      blockedUsers,

      totalXpGenerated,
      averageXpGenerated,
      mostUsedActivities,

      averageScore: average(scoreValues),
      averageAccuracy: average(accuracyValues),
      averageAttempts,
      highestErrorContent,

      averageRating: average(ratings),
      feedbackCount: feedback.length,
      complaintCount: feedback.filter((item) => item.type === "complaint").length,

      updatedAt: effectiveUpdatedAt,
      createdBy: createdById || null,
      createdByName: createdById ? actorNames.get(createdById) ?? createdById : null,
      updatedBy: updatedById || null,
      updatedByName: updatedById ? actorNames.get(updatedById) ?? updatedById : null,
      publicationHistory,
      changeHistory: mappedAudit,
      version: Number(trail.version ?? 1),

      health: {
        score: configurationPercent,
        modulesWithoutLessons,
        lessonsWithoutPublishedVersion,
        invalidPrerequisites,
        nonexistentActivities,
        invalidUrls,
        warnings,
      },
      configurationPercent,

      inProgressUsers,
      completions7d,
      completions30d,
      newEnrollments7d,
      newEnrollments30d,
      trend: {
        direction:
          difference > 5 ? "up" : difference < -5 ? "down" : "stable",
        percentage: Number(Math.abs(difference).toFixed(1)),
        currentPeriod,
        previousPeriod,
      },
    };
  }
}

export const trailAnalyticsService = new TrailAnalyticsService();
