import type { Request, Response } from "express";
import { db } from "../../config/firebase";
import type { DocumentData, QuerySnapshot } from "firebase-admin/firestore";
const COLLECTIONS = {
  users: "users",
  userProgress: "user_progress",
  games: "games",
  gameHistory: "game_history",
  trails: "trails",
  enrollments: "enrollments",
  knowledge: "knowledge_articles",
  levels: "levels",
  rewards: "rewards",
  xpRules: "xp_activity_rules",
  supports: "supports",
  clinicalCases: "clinical_cases",
  laboratoryModules: "laboratory_modules",
  announcements: "announcements",
  feedback: "experience_feedback",
} as const;
type FirestoreLikeTimestamp = {
  toDate?: () => Date;
  _seconds?: number;
  seconds?: number;
};
type RecentActivity = {
  id: string;
  type: "user" | "game" | "trail" | "support";
  title: string;
  description?: string;
  createdAt?: string | null;
  link?: string;
};
const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
const normalizeStatus = (value: unknown) => normalizeText(value);
const normalizePriority = (value: unknown) => normalizeText(value);
const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const timestamp = value as FirestoreLikeTimestamp;
    if (typeof timestamp.toDate === "function") {
      const parsed = timestamp.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const seconds =
      typeof timestamp._seconds === "number"
        ? timestamp._seconds
        : timestamp.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000);
    }
  }
  return null;
};
const dateKeyInBrazil = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
};
const labelInBrazil = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "");
const isoOrNull = (value: unknown) => {
  const date = toDate(value);
  return date ? date.toISOString() : null;
};
const isWithinLastDays = (value: unknown, days: number) => {
  const date = toDate(value);
  if (!date) return false;
  const now = Date.now();
  const min = now - days * 24 * 60 * 60 * 1000;
  return date.getTime() >= min && date.getTime() <= now;
};
const buildLastSevenDays = () => {
  const result: {
    key: string;
    label: string;
    usuarios: number;
    jogos: number;
    trilhas: number;
    suporte: number;
  }[] = [];
  const now = new Date();
  const todayAtNoon = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      15,
      0,
      0,
    ),
  );
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(todayAtNoon);
    date.setUTCDate(date.getUTCDate() - offset);
    result.push({
      key: dateKeyInBrazil(date),
      label: labelInBrazil(date),
      usuarios: 0,
      jogos: 0,
      trilhas: 0,
      suporte: 0,
    });
  }
  return result;
};
type DashboardDocument = {
  id: string;
  [key: string]: any;
};
const snapshotToDocuments = (
  snapshot: QuerySnapshot<DocumentData>,
): DashboardDocument[] => {
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, any>),
  }));
};
export const getAdminDashboard = async (_req: Request, res: Response) => {
  try {
    const [
      usersSnapshot,
      userProgressSnapshot,
      gamesSnapshot,
      gameHistorySnapshot,
      trailsSnapshot,
      enrollmentsSnapshot,
      knowledgeSnapshot,
      levelsSnapshot,
      rewardsSnapshot,
      xpRulesSnapshot,
      supportsSnapshot,
      clinicalCasesSnapshot,
      laboratoryModulesSnapshot,
      announcementsSnapshot,
      feedbackSnapshot,
      registrationSettingsSnapshot,
      registrationAttemptsSnapshot,
    ] = await Promise.all([
      db.collection(COLLECTIONS.users).get(),
      db.collection(COLLECTIONS.userProgress).get(),
      db.collection(COLLECTIONS.games).get(),
      db.collection(COLLECTIONS.gameHistory).get(),
      db.collection(COLLECTIONS.trails).get(),
      db.collection(COLLECTIONS.enrollments).get(),
      db.collection(COLLECTIONS.knowledge).get(),
      db.collection(COLLECTIONS.levels).get(),
      db.collection(COLLECTIONS.rewards).get(),
      db.collection(COLLECTIONS.xpRules).get(),
      db.collection(COLLECTIONS.supports).get(),
      db.collection(COLLECTIONS.clinicalCases).get(),
      db.collection(COLLECTIONS.laboratoryModules).get(),
      db.collection(COLLECTIONS.announcements).get(),
      db.collection(COLLECTIONS.feedback).get(),
      db.collection("platform_settings").doc("registration").get(),
      db.collection("registration_attempts").get(),
    ]);
    const users = snapshotToDocuments(usersSnapshot);
    const userProgress = snapshotToDocuments(userProgressSnapshot);
    const games = snapshotToDocuments(gamesSnapshot);
    const gameHistory = snapshotToDocuments(gameHistorySnapshot);
    const trails = snapshotToDocuments(trailsSnapshot);
    const enrollments = snapshotToDocuments(enrollmentsSnapshot);
    const knowledge = snapshotToDocuments(knowledgeSnapshot);
    const levels = snapshotToDocuments(levelsSnapshot);
    const rewards = snapshotToDocuments(rewardsSnapshot);
    const xpRules = snapshotToDocuments(xpRulesSnapshot);
    const supports = snapshotToDocuments(supportsSnapshot);
    const clinicalCases = snapshotToDocuments(clinicalCasesSnapshot);
    const laboratoryModules = snapshotToDocuments(laboratoryModulesSnapshot);
    const announcements = snapshotToDocuments(announcementsSnapshot);
    const feedback = snapshotToDocuments(feedbackSnapshot);
    const registrationSettings = registrationSettingsSnapshot.data();
    const registrationMetrics = {
      allowNewRegistrations: registrationSettings?.allowNewRegistrations !== false,
      closedMessage: String(registrationSettings?.closedMessage ?? "A administração ainda não liberou a criação de novas contas."),
      reopenAt: isoOrNull(registrationSettings?.reopenAt),
      blockedAttempts: registrationAttemptsSnapshot.size,
      blockedAttemptsLast7Days: registrationAttemptsSnapshot.docs.filter((item) => isWithinLastDays(item.data().createdAt, 7)).length,
    };
    const activeUserIds = new Set(
      userProgress
        .filter((item) => item.active !== false)
        .map((item) => String(item.userId ?? item.id)),
    );
    const usersMetrics = {
      total: users.length,
      active: users.filter((item) => activeUserIds.has(String(item.id))).length,
      newLast7Days: users.filter((item) => isWithinLastDays(item.createdAt, 7))
        .length,
    };
    const gameStatusCount = (status: string) =>
      games.filter((game) => normalizeStatus(game.status) === status).length;
    const gamesMetrics = {
      total: games.length,
      available: gameStatusCount("disponivel"),
      unavailable: gameStatusCount("indisponivel"),
      building: gameStatusCount("em_construcao"),
      updating: gameStatusCount("em_atualizacao"),
      review: gameStatusCount("em_revisao"),
      draft: gameStatusCount("rascunho"),
      plays: gameHistory.length,
    };
    const trailsMetrics = {
      total: trails.length,
      available: trails.filter(
        (trail) => normalizeStatus(trail.status) === "disponivel",
      ).length,
      draft: trails.filter(
        (trail) => normalizeStatus(trail.status) === "rascunho",
      ).length,
    };
    const enrollmentStatus = (value: unknown) => normalizeStatus(value);
    const enrollmentsMetrics = {
      total: enrollments.length,
      active: enrollments.filter((item) =>
        ["matriculado", "em_andamento"].includes(enrollmentStatus(item.status)),
      ).length,
      completed: enrollments.filter(
        (item) => enrollmentStatus(item.status) === "concluido",
      ).length,
    };
    const knowledgeMetrics = {
      total: knowledge.length,
      published: knowledge.filter(
        (item) => normalizeStatus(item.status) === "publicado",
      ).length,
      draft: knowledge.filter(
        (item) => normalizeStatus(item.status) === "rascunho",
      ).length,
      archived: knowledge.filter(
        (item) => normalizeStatus(item.status) === "arquivado",
      ).length,
    };
    const levelsMetrics = {
      total: levels.length,
      active: levels.filter((item) => item.active === true).length,
      inactive: levels.filter((item) => item.active !== true).length,
    };
    const rewardsMetrics = {
      total: rewards.length,
      active: rewards.filter((item) => item.active === true).length,
      inactive: rewards.filter((item) => item.active !== true).length,
    };
    const xpRulesMetrics = {
      total: xpRules.length,
      active: xpRules.filter((item) => item.active === true).length,
      inactive: xpRules.filter((item) => item.active !== true).length,
    };
    const supportStatusCount = (status: string) =>
      supports.filter((support) => normalizeStatus(support.status) === status)
        .length;
    const supportPriorityCount = (priority: string) =>
      supports.filter(
        (support) => normalizePriority(support.priority) === priority,
      ).length;
    const supportMetrics = {
      total: supports.length,
      open: supportStatusCount("aberto"),
      inProgress: supportStatusCount("em_andamento"),
      waitingUser: supportStatusCount("aguardando_usuario"),
      resolved: supportStatusCount("resolvido"),
      closed: supportStatusCount("fechado"),
      priority: {
        low: supportPriorityCount("baixa"),
        normal: supportPriorityCount("normal"),
        high: supportPriorityCount("alta"),
        urgent: supportPriorityCount("urgente"),
      },
    };
    const clinicalMetrics = {
      total: clinicalCases.length,
      published: clinicalCases.filter(
        (item) => normalizeStatus(item.status) === "publicado",
      ).length,
      draft: clinicalCases.filter(
        (item) => normalizeStatus(item.status) === "rascunho",
      ).length,
      archived: clinicalCases.filter(
        (item) => normalizeStatus(item.status) === "arquivado",
      ).length,
    };
    const laboratoryMetrics = {
      total: laboratoryModules.length,
      available: laboratoryModules.filter(
        (item) => normalizeStatus(item.status) === "disponivel",
      ).length,
      unavailable: laboratoryModules.filter(
        (item) => normalizeStatus(item.status) === "indisponivel",
      ).length,
      building: laboratoryModules.filter(
        (item) => normalizeStatus(item.status) === "em_construcao",
      ).length,
    };
    const announcementMetrics = {
      total: announcements.length,
      published: announcements.filter((item) => normalizeStatus(item.status) === "published").length,
      draft: announcements.filter((item) => normalizeStatus(item.status) === "draft").length,
      archived: announcements.filter((item) => normalizeStatus(item.status) === "archived").length,
    };
    const feedbackRatings = feedback
      .map((item) => Number(item.rating))
      .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
    const feedbackMetrics = {
      total: feedback.length,
      averageRating: feedbackRatings.length
        ? Number(
            (
              feedbackRatings.reduce((total, rating) => total + rating, 0) /
              feedbackRatings.length
            ).toFixed(1),
          )
        : 0,
      withComments: feedback.filter((item) =>
        Boolean(String(item.comment ?? "").trim()),
      ).length,
      complaints: feedback.filter(
        (item) => item.type === "complaint" || Number(item.rating) <= 2,
      ).length,
    };
    const overview = buildLastSevenDays();
    const overviewMap = new Map(overview.map((item) => [item.key, item]));
    const incrementOverview = (
      rawDate: unknown,
      field: "usuarios" | "jogos" | "trilhas" | "suporte",
    ) => {
      const date = toDate(rawDate);
      if (!date) return;
      const key = dateKeyInBrazil(date);
      const day = overviewMap.get(key);
      if (!day) return;
      day[field] += 1;
    };
    users.forEach((item) => {
      incrementOverview(item.createdAt, "usuarios");
    });
    gameHistory.forEach((item) => {
      incrementOverview(item.completedAt ?? item.createdAt, "jogos");
    });
    enrollments
      .filter((item) => enrollmentStatus(item.status) === "concluido")
      .forEach((item) => {
        incrementOverview(item.completedAt ?? item.updatedAt, "trilhas");
      });
    supports.forEach((item) => {
      incrementOverview(item.createdAt, "suporte");
    });
    const overviewResponse = overview.map(({ key: _key, ...item }) => item);
    const trailMap = new Map(
      trails.map((trail) => [
        String(trail.id),
        String(trail.title ?? trail.name ?? "Trilha"),
      ]),
    );
    const recentActivity: RecentActivity[] = [
      ...users.map(
        (item): RecentActivity => ({
          id: `user-${item.id}`,
          type: "user",
          title: "Novo usuário cadastrado",
          description: String(item.name ?? item.username ?? "Novo usuário"),
          createdAt: isoOrNull(item.createdAt),
          link: "/admin/users",
        }),
      ),
      ...gameHistory.map(
        (item): RecentActivity => ({
          id: `game-${item.id}`,
          type: "game",
          title: "Jogo concluído",
          description: String(item.gameName ?? "Partida registrada"),
          createdAt: isoOrNull(item.completedAt ?? item.createdAt),
          link: "/admin/games",
        }),
      ),
      ...enrollments
        .filter((item) => enrollmentStatus(item.status) === "concluido")
        .map(
          (item): RecentActivity => ({
            id: `trail-${item.id}`,
            type: "trail",
            title: "Trilha concluída",
            description:
              trailMap.get(String(item.trailId)) ??
              String(item.trailTitle ?? "Trilha concluída"),
            createdAt: isoOrNull(item.completedAt ?? item.updatedAt),
            link: "/admin/trails",
          }),
        ),
      ...supports.map(
        (item): RecentActivity => ({
          id: `support-${item.id}`,
          type: "support",
          title: "Novo chamado de suporte",
          description: String(item.title ?? "Solicitação de suporte"),
          createdAt: isoOrNull(item.createdAt),
          link: `/admin/support/${item.id}`,
        }),
      ),
    ]
      .filter((item) => Boolean(item.createdAt))
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
      .slice(0, 8);
    return res.status(200).json({
      users: usersMetrics,
      games: gamesMetrics,
      trails: trailsMetrics,
      enrollments: enrollmentsMetrics,
      knowledge: knowledgeMetrics,
      levels: levelsMetrics,
      rewards: rewardsMetrics,
      xpRules: xpRulesMetrics,
      support: supportMetrics,
      clinical: clinicalMetrics,
      laboratory: laboratoryMetrics,
      announcements: announcementMetrics,
      feedback: feedbackMetrics,
      registration: registrationMetrics,
      overview: overviewResponse,
      recentActivity,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao carregar dashboard administrativo:", error);
    return res.status(500).json({
      message: "Não foi possível carregar o dashboard administrativo.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
