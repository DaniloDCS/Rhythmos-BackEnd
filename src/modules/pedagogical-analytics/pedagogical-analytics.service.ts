import {
  COMPETENCY_BY_ID,
  PEDAGOGICAL_COMPETENCIES,
} from "./pedagogical-analytics.catalog";
import type {
  PedagogicalAnalyticsResponse,
  PedagogicalClassification,
  PedagogicalDimensionSummary,
  PedagogicalEvidenceDetail,
  PedagogicalEvidenceItem,
  PedagogicalEvidenceSource,
  PedagogicalImprovementSummary,
  PedagogicalTrend,
  PedagogicalWeeklyPoint,
} from "./pedagogical-analytics.types";
import {
  PedagogicalAnalyticsRepository,
  pedagogicalAnalyticsRepository,
  type RawGameDefinition,
  type RawGameHistory,
  type RawLearningEvent,
} from "./pedagogical-analytics.repository";
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));
const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
const average = (values: number[]): number | null =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const slugify = (value: string) =>
  normalizeText(value)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
const titleize = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
const GENERIC_CONTENT_TAGS = new Set([
  "ecg",
  "eletrocardiograma",
  "jogo",
  "jogos",
  "game",
  "quiz",
  "outro",
  "facil",
  "medio",
  "dificil",
]);
const meaningfulContentTags = (values: string[]) =>
  values.filter((value) => !GENERIC_CONTENT_TAGS.has(normalizeText(value)));
const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
};
const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const timestampToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const object = value as {
      toDate?: () => Date;
      _seconds?: number;
      seconds?: number;
    };
    if (typeof object.toDate === "function") {
      const parsed = object.toDate();
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const seconds = object._seconds ?? object.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000);
    }
  }
  return null;
};
const normalizeAccuracy = (
  correctAnswers: number | null,
  totalAnswers: number | null,
) => {
  if (correctAnswers === null || totalAnswers === null || totalAnswers <= 0) {
    return null;
  }
  return clamp((correctAnswers / totalAnswers) * 100);
};
const normalizePerformance = (input: {
  score: number | null;
  accuracy: number | null;
  successful?: boolean;
}) => {
  if (input.accuracy !== null) {
    return clamp(input.accuracy);
  }
  if (input.score !== null && input.score >= 0 && input.score <= 100) {
    return clamp(input.score);
  }
  if (typeof input.successful === "boolean") {
    return input.successful ? 85 : 45;
  }
  return 50;
};
const normalizeEvidenceDetails = (
  value: unknown,
): PedagogicalEvidenceDetail[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce<PedagogicalEvidenceDetail[]>((result, item) => {
    if (!item || typeof item !== "object") {
      return result;
    }
    const raw = item as Record<string, unknown>;
    const contentName = String(
      raw.contentName ?? raw.name ?? raw.content ?? "",
    ).trim();
    if (!contentName) {
      return result;
    }
    const detail: PedagogicalEvidenceDetail = {
      contentName,
    };
    if (typeof raw.contentId === "string" && raw.contentId.trim()) {
      detail.contentId = raw.contentId.trim();
    }
    const competencyIds = asStringArray(raw.competencyIds);
    if (competencyIds.length > 0) {
      detail.competencyIds = competencyIds;
    }
    if (typeof raw.correct === "boolean") {
      detail.correct = raw.correct;
    }
    const score = asNumber(raw.score);
    if (score !== null) {
      detail.score = clamp(score);
    }
    result.push(detail);
    return result;
  }, []);
};
const inferCompetencyIds = (values: string[], explicit: string[] = []) => {
  const result = new Set<string>();
  for (const id of explicit) {
    if (COMPETENCY_BY_ID.has(id)) {
      result.add(id);
    }
  }
  const haystack = normalizeText(values.join(" "));
  for (const competency of PEDAGOGICAL_COMPETENCIES) {
    const matched = competency.keywords.some((keyword) =>
      haystack.includes(normalizeText(keyword)),
    );
    if (matched) {
      result.add(competency.id);
    }
  }
  if (!result.size && /\becg\b|eletrocardiograma/.test(haystack)) {
    result.add("fundamentos_ecg");
  }
  return [...result];
};
const gameContentTags = (
  game: RawGameDefinition | undefined,
  fallbackName: string,
) => {
  const tags = meaningfulContentTags(asStringArray(game?.tags));
  if (tags.length) return tags;
  if (game?.category) {
    return [titleize(game.category), fallbackName];
  }
  return [fallbackName].filter(Boolean);
};
const learningEventContentTags = (event: RawLearningEvent) => {
  const metadata = event.metadata ?? {};
  const candidates = [
    ...asStringArray(event.contentTags),
    ...asStringArray(metadata.contentTags),
    ...asStringArray(metadata.tags),
    ...asStringArray(metadata.topics),
  ];
  const meaningful = meaningfulContentTags(candidates);
  if (meaningful.length) {
    return [...new Set(meaningful)];
  }
  const fallback =
    event.lessonName ?? event.simulatorName ?? event.gameName ?? "";
  return fallback ? [fallback] : [];
};
const sourceTypeFromLearningEvent = (
  event: RawLearningEvent,
): PedagogicalEvidenceSource | null => {
  switch (event.type) {
    case "simulation_completed":
      return "simulation";
    case "exercise_completed":
      return "exercise";
    case "quiz_completed":
      return "quiz";
    case "lesson_completed":
      return event.score !== null && event.score !== undefined
        ? "exercise"
        : event.totalAnswers
          ? "exercise"
          : null;
    case "game_completed":
      return null;
    default:
      return null;
  }
};
const normalizeGameEvidence = (
  history: RawGameHistory,
  game: RawGameDefinition | undefined,
): PedagogicalEvidenceItem | null => {
  const occurredAt =
    timestampToDate(history.completedAt) ?? timestampToDate(history.createdAt);
  if (!occurredAt) return null;
  const correctAnswers = asNumber(history.correctAnswers);
  const totalAnswers = asNumber(history.totalAnswers);
  const accuracy = normalizeAccuracy(correctAnswers, totalAnswers);
  const score = asNumber(history.score);
  const successful = Boolean(history.won);
  const sourceName = history.gameName ?? game?.name ?? "Jogo";
  const contentTags = gameContentTags(game, sourceName);
  const details = normalizeEvidenceDetails(history.pedagogicalEvidence);
  const detailCompetencies = details.flatMap(
    (detail) => detail.competencyIds ?? [],
  );
  const competencyIds = inferCompetencyIds(
    [
      sourceName,
      game?.description ?? "",
      game?.shortDescription ?? "",
      ...(game?.tags ?? []),
      ...details.map((detail) => detail.contentName),
    ],
    detailCompetencies,
  );
  return {
    id: history.id,
    userId: history.userId,
    sourceType: "game",
    sourceId: history.gameId ?? game?.id ?? "",
    sourceName,
    occurredAt,
    score,
    correctAnswers,
    totalAnswers,
    accuracy,
    performance: normalizePerformance({
      score,
      accuracy,
      successful,
    }),
    timeSeconds: Math.max(0, asNumber(history.timeSeconds) ?? 0),
    attempt: 1,
    successful,
    contentTags,
    competencyIds,
    details,
  };
};
const normalizeLearningEvidence = (
  event: RawLearningEvent,
): PedagogicalEvidenceItem | null => {
  const sourceType = sourceTypeFromLearningEvent(event);
  if (!sourceType) return null;
  const occurredAt = timestampToDate(event.createdAt);
  if (!occurredAt) return null;
  const correctAnswers = asNumber(event.correctAnswers);
  const totalAnswers = asNumber(event.totalAnswers);
  const accuracy = normalizeAccuracy(correctAnswers, totalAnswers);
  const score = asNumber(event.score);
  const metadata = event.metadata ?? {};
  const explicitSuccess =
    typeof metadata.successful === "boolean"
      ? metadata.successful
      : typeof metadata.passed === "boolean"
        ? metadata.passed
        : undefined;
  const performance = normalizePerformance({
    score,
    accuracy,
    successful: explicitSuccess,
  });
  const successful = explicitSuccess ?? performance >= 70;
  const sourceId =
    event.simulatorId ?? event.lessonId ?? event.gameId ?? event.id;
  const sourceName =
    event.simulatorName ?? event.lessonName ?? event.gameName ?? sourceType;
  const contentTags = learningEventContentTags(event);
  const details = normalizeEvidenceDetails(
    event.pedagogicalEvidence ??
      metadata.pedagogicalEvidence ??
      metadata.evidence,
  );
  const explicitCompetencies = [
    ...asStringArray(event.competencyIds),
    ...asStringArray(metadata.competencyIds),
    ...details.flatMap((detail) => detail.competencyIds ?? []),
  ];
  const competencyIds = inferCompetencyIds(
    [
      sourceName,
      ...contentTags,
      ...details.map((detail) => detail.contentName),
    ],
    explicitCompetencies,
  );
  const timeSeconds =
    asNumber(event.timeSeconds) ??
    asNumber(metadata.timeSeconds) ??
    asNumber(metadata.durationSeconds) ??
    asNumber(metadata.practiceSeconds) ??
    0;
  return {
    id: event.id,
    userId: event.userId,
    sourceType,
    sourceId,
    sourceName,
    occurredAt,
    score,
    correctAnswers,
    totalAnswers,
    accuracy,
    performance,
    timeSeconds: Math.max(0, timeSeconds),
    attempt: Math.max(1, Math.floor(asNumber(event.attempt) ?? 1)),
    successful,
    contentTags,
    competencyIds,
    details,
  };
};
const startOfUtcWeek = (date: Date) => {
  const copy = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = copy.getUTCDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  copy.setUTCDate(copy.getUTCDate() - distanceFromMonday);
  return copy;
};
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const buildWeekly = (
  evidence: PedagogicalEvidenceItem[],
  weeks: number,
  now = new Date(),
): {
  weekly: PedagogicalWeeklyPoint[];
  from: Date;
  to: Date;
} => {
  const currentWeekStart = startOfUtcWeek(now);
  const from = new Date(currentWeekStart.getTime() - (weeks - 1) * WEEK_MS);
  const to = now;
  const weekly: PedagogicalWeeklyPoint[] = Array.from(
    { length: weeks },
    (_, index) => {
      const start = new Date(from.getTime() + index * WEEK_MS);
      const end = new Date(start.getTime() + WEEK_MS - 1);
      return {
        weekIndex: index + 1,
        label: `Sem ${index + 1}`,
        startDate: dateKey(start),
        endDate: dateKey(end),
        activities: 0,
        successfulActivities: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        accuracy: null,
        averagePerformance: null,
        totalPracticeSeconds: 0,
        averageTimeSeconds: null,
        attempts: 0,
        attemptsPerSuccess: null,
      };
    },
  );
  const buckets = weekly.map(() => ({
    performance: [] as number[],
    times: [] as number[],
  }));
  for (const item of evidence) {
    if (item.occurredAt < from || item.occurredAt > to) {
      continue;
    }
    const index = Math.floor(
      (item.occurredAt.getTime() - from.getTime()) / WEEK_MS,
    );
    if (index < 0 || index >= weekly.length) {
      continue;
    }
    const point = weekly[index];
    point.activities += 1;
    point.attempts += 1;
    if (item.successful) {
      point.successfulActivities += 1;
    }
    if (
      item.correctAnswers !== null &&
      item.totalAnswers !== null &&
      item.totalAnswers > 0
    ) {
      point.correctAnswers += item.correctAnswers;
      point.totalAnswers += item.totalAnswers;
    }
    point.totalPracticeSeconds += item.timeSeconds;
    buckets[index].performance.push(item.performance);
    if (item.timeSeconds > 0) {
      buckets[index].times.push(item.timeSeconds);
    }
  }
  for (let index = 0; index < weekly.length; index += 1) {
    const point = weekly[index];
    const bucket = buckets[index];
    point.accuracy =
      point.totalAnswers > 0
        ? round((point.correctAnswers / point.totalAnswers) * 100)
        : null;
    const performance = average(bucket.performance);
    point.averagePerformance = performance === null ? null : round(performance);
    const time = average(bucket.times);
    point.averageTimeSeconds = time === null ? null : Math.round(time);
    point.attemptsPerSuccess =
      point.successfulActivities > 0
        ? round(point.attempts / point.successfulActivities, 2)
        : point.attempts > 0
          ? point.attempts
          : null;
  }
  return {
    weekly,
    from,
    to,
  };
};
const aggregateOverall = (
  evidence: PedagogicalEvidenceItem[],
  weekly: PedagogicalWeeklyPoint[],
) => {
  const correctAnswers = evidence.reduce(
    (sum, item) => sum + (item.correctAnswers ?? 0),
    0,
  );
  const totalAnswers = evidence.reduce(
    (sum, item) => sum + (item.totalAnswers ?? 0),
    0,
  );
  const totalPracticeSeconds = evidence.reduce(
    (sum, item) => sum + item.timeSeconds,
    0,
  );
  const times = evidence
    .map((item) => item.timeSeconds)
    .filter((value) => value > 0);
  const performance = average(evidence.map((item) => item.performance));
  const successfulActivities = evidence.filter(
    (item) => item.successful,
  ).length;
  return {
    activities: evidence.length,
    successfulActivities,
    correctAnswers,
    totalAnswers,
    accuracy:
      totalAnswers > 0 ? round((correctAnswers / totalAnswers) * 100) : null,
    averagePerformance: performance === null ? null : round(performance),
    totalPracticeSeconds,
    averageTimeSeconds: times.length
      ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
      : null,
    attempts: evidence.length,
    attemptsPerSuccess:
      successfulActivities > 0
        ? round(evidence.length / successfulActivities, 2)
        : evidence.length
          ? evidence.length
          : null,
    activeWeeks: weekly.filter((item) => item.activities > 0).length,
  };
};
const weightedMastery = (items: PedagogicalEvidenceItem[], now: Date) => {
  if (!items.length) return 0;
  let total = 0;
  let weightTotal = 0;
  for (const item of items) {
    const ageDays = Math.max(
      0,
      (now.getTime() - item.occurredAt.getTime()) / DAY_MS,
    );
    const weight = Math.max(0.45, Math.exp(-ageDays / 120));
    total += item.performance * weight;
    weightTotal += weight;
  }
  return weightTotal ? clamp(total / weightTotal) : 0;
};
const splitPeriodPerformance = (items: PedagogicalEvidenceItem[]) => {
  if (items.length < 2) {
    return {
      trend: "insufficient_data" as PedagogicalTrend,
      delta: 0,
    };
  }
  const sorted = [...items].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
  const midpoint = Math.max(1, Math.floor(sorted.length / 2));
  const first = sorted.slice(0, midpoint);
  const second = sorted.slice(midpoint);
  if (!second.length) {
    return {
      trend: "insufficient_data" as PedagogicalTrend,
      delta: 0,
    };
  }
  const firstAverage = average(first.map((item) => item.performance)) ?? 0;
  const secondAverage = average(second.map((item) => item.performance)) ?? 0;
  const delta = round(secondAverage - firstAverage);
  const trend: PedagogicalTrend =
    delta >= 5 ? "improving" : delta <= -5 ? "declining" : "stable";
  return {
    trend,
    delta,
  };
};
const classify = (
  mastery: number,
  accuracy: number | null,
  attempts: number,
  trend: PedagogicalTrend,
): PedagogicalClassification => {
  if (attempts < 2) {
    return "insufficient_data";
  }
  if (mastery < 60 || (accuracy !== null && accuracy < 60)) {
    return "fragility";
  }
  if (mastery >= 80 && trend !== "declining") {
    return "potentiality";
  }
  return "developing";
};
const aggregateDimension = (
  id: string,
  name: string,
  kind: "competency" | "content",
  items: PedagogicalEvidenceItem[],
  now: Date,
  extra?: {
    icon?: string;
    description?: string;
  },
): PedagogicalDimensionSummary => {
  const correctAnswers = items.reduce(
    (sum, item) => sum + (item.correctAnswers ?? 0),
    0,
  );
  const totalAnswers = items.reduce(
    (sum, item) => sum + (item.totalAnswers ?? 0),
    0,
  );
  const accuracy =
    totalAnswers > 0 ? round((correctAnswers / totalAnswers) * 100) : null;
  const performance = average(items.map((item) => item.performance)) ?? 0;
  const mastery = round(weightedMastery(items, now));
  const { trend, delta } = splitPeriodPerformance(items);
  const confidence = Math.round(clamp(Math.min(1, items.length / 8) * 100));
  const latest = [...items].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  )[0];
  return {
    id,
    name,
    kind,
    icon: extra?.icon,
    description: extra?.description,
    mastery,
    accuracy,
    averagePerformance: round(performance),
    attempts: items.length,
    correctAnswers,
    totalAnswers,
    practiceSeconds: items.reduce((sum, item) => sum + item.timeSeconds, 0),
    trend,
    delta,
    classification: classify(mastery, accuracy, items.length, trend),
    confidence,
    lastActivityAt: latest?.occurredAt.toISOString() ?? null,
  };
};
const buildCompetencies = (evidence: PedagogicalEvidenceItem[], now: Date) => {
  const map = new Map<string, PedagogicalEvidenceItem[]>();
  for (const item of evidence) {
    for (const competencyId of item.competencyIds) {
      const list = map.get(competencyId) ?? [];
      list.push(item);
      map.set(competencyId, list);
    }
  }
  return PEDAGOGICAL_COMPETENCIES.map((definition) => {
    const items = map.get(definition.id) ?? [];
    if (!items.length) return null;
    return aggregateDimension(
      definition.id,
      definition.name,
      "competency",
      items,
      now,
      {
        icon: definition.icon,
        description: definition.description,
      },
    );
  })
    .filter((item): item is PedagogicalDimensionSummary => Boolean(item))
    .sort((a, b) => b.mastery - a.mastery);
};
const detailToEvidence = (
  parent: PedagogicalEvidenceItem,
  detail: PedagogicalEvidenceDetail,
): PedagogicalEvidenceItem => {
  const performance =
    detail.score !== undefined
      ? clamp(detail.score)
      : detail.correct === true
        ? 100
        : detail.correct === false
          ? 0
          : parent.performance;
  const correctAnswers =
    detail.correct === true ? 1 : detail.correct === false ? 0 : null;
  const totalAnswers = typeof detail.correct === "boolean" ? 1 : null;
  return {
    ...parent,
    id: `${parent.id}:${detail.contentId ?? slugify(detail.contentName)}`,
    sourceName: detail.contentName,
    score: detail.score ?? null,
    correctAnswers,
    totalAnswers,
    accuracy:
      typeof detail.correct === "boolean" ? (detail.correct ? 100 : 0) : null,
    performance,
    timeSeconds: 0,
    contentTags: [detail.contentName],
    competencyIds: inferCompetencyIds(
      [detail.contentName],
      detail.competencyIds ?? [],
    ),
    details: [],
  };
};
const buildContents = (evidence: PedagogicalEvidenceItem[], now: Date) => {
  const map = new Map<
    string,
    {
      name: string;
      items: PedagogicalEvidenceItem[];
    }
  >();
  for (const item of evidence) {
    for (const detail of item.details) {
      const detailEvidence = detailToEvidence(item, detail);
      const id = detail.contentId?.trim() || slugify(detail.contentName);
      const current = map.get(id) ?? {
        name: detail.contentName,
        items: [],
      };
      current.items.push(detailEvidence);
      map.set(id, current);
    }
    for (const tag of item.contentTags) {
      const id = slugify(tag);
      if (!id) continue;
      const current = map.get(id) ?? {
        name: titleize(tag),
        items: [],
      };
      current.items.push(item);
      map.set(id, current);
    }
  }
  return [...map.entries()]
    .map(([id, group]) =>
      aggregateDimension(id, group.name, "content", group.items, now),
    )
    .sort((a, b) => b.attempts - a.attempts || b.mastery - a.mastery);
};
const metricAverage = (
  points: PedagogicalWeeklyPoint[],
  getter: (point: PedagogicalWeeklyPoint) => number | null,
) => {
  const values = points
    .map(getter)
    .filter((value): value is number => value !== null);
  return average(values);
};
const buildImprovement = (
  weekly: PedagogicalWeeklyPoint[],
  totalActivities: number,
): PedagogicalImprovementSummary => {
  const active = weekly.filter((point) => point.activities > 0);
  if (active.length < 2 || totalActivities < 4) {
    return {
      trend: "insufficient_data",
      isImproving: null,
      headline: "Ainda não há dados suficientes para medir evolução.",
      detail:
        "Continue praticando. O Rhythmos precisa de atividades distribuídas em pelo menos duas semanas para comparar seu desempenho no tempo.",
      confidence: Math.round(
        clamp(Math.min(active.length / 2, totalActivities / 4) * 45),
      ),
      accuracyDelta: null,
      performanceDelta: null,
      averageTimeDeltaPercent: null,
      attemptsPerSuccessDelta: null,
    };
  }
  const windowSize = Math.min(3, Math.max(1, Math.floor(active.length / 2)));
  const early = active.slice(0, windowSize);
  const recent = active.slice(-windowSize);
  const earlyAccuracy = metricAverage(early, (point) => point.accuracy);
  const recentAccuracy = metricAverage(recent, (point) => point.accuracy);
  const earlyPerformance = metricAverage(
    early,
    (point) => point.averagePerformance,
  );
  const recentPerformance = metricAverage(
    recent,
    (point) => point.averagePerformance,
  );
  const earlyTime = metricAverage(early, (point) => point.averageTimeSeconds);
  const recentTime = metricAverage(recent, (point) => point.averageTimeSeconds);
  const earlyAttempts = metricAverage(
    early,
    (point) => point.attemptsPerSuccess,
  );
  const recentAttempts = metricAverage(
    recent,
    (point) => point.attemptsPerSuccess,
  );
  const accuracyDelta =
    earlyAccuracy !== null && recentAccuracy !== null
      ? round(recentAccuracy - earlyAccuracy)
      : null;
  const performanceDelta =
    earlyPerformance !== null && recentPerformance !== null
      ? round(recentPerformance - earlyPerformance)
      : null;
  const averageTimeDeltaPercent =
    earlyTime !== null && recentTime !== null && earlyTime > 0
      ? round(((recentTime - earlyTime) / earlyTime) * 100)
      : null;
  const attemptsPerSuccessDelta =
    earlyAttempts !== null && recentAttempts !== null
      ? round(recentAttempts - earlyAttempts, 2)
      : null;
  let signal = 0;
  let signalWeight = 0;
  if (accuracyDelta !== null) {
    signal += accuracyDelta * 0.6;
    signalWeight += 0.6;
  }
  if (performanceDelta !== null) {
    signal += performanceDelta * 0.4;
    signalWeight += 0.4;
  }
  if (averageTimeDeltaPercent !== null) {
    signal += clamp(-averageTimeDeltaPercent * 0.08, -4, 4);
  }
  const normalizedSignal = signalWeight > 0 ? signal / signalWeight : signal;
  const trend: PedagogicalTrend =
    normalizedSignal >= 5
      ? "improving"
      : normalizedSignal <= -5
        ? "declining"
        : "stable";
  const confidence = Math.round(
    clamp(Math.min(1, active.length / 5, totalActivities / 12) * 100),
  );
  if (trend === "improving") {
    return {
      trend,
      isImproving: true,
      headline: "Sim — seu desempenho apresenta evolução.",
      detail:
        accuracyDelta !== null
          ? `A precisão recente está ${Math.abs(accuracyDelta).toFixed(1)} p.p. ${accuracyDelta >= 0 ? "acima" : "abaixo"} do início do período. O sistema também considera desempenho, tempo e repetição das tentativas.`
          : "O desempenho das atividades recentes está acima do início do período.",
      confidence,
      accuracyDelta,
      performanceDelta,
      averageTimeDeltaPercent,
      attemptsPerSuccessDelta,
    };
  }
  if (trend === "declining") {
    return {
      trend,
      isImproving: false,
      headline: "Seu desempenho recente caiu em relação ao início do período.",
      detail:
        "Isso não significa regressão definitiva. O painel indica quais conteúdos e competências concentraram mais erros para orientar a próxima prática.",
      confidence,
      accuracyDelta,
      performanceDelta,
      averageTimeDeltaPercent,
      attemptsPerSuccessDelta,
    };
  }
  return {
    trend,
    isImproving: false,
    headline: "Seu desempenho está relativamente estável.",
    detail:
      "Ainda não há uma variação grande o suficiente para afirmar melhora ou queda consistente. Observe as competências em desenvolvimento e mantenha a prática.",
    confidence,
    accuracyDelta,
    performanceDelta,
    averageTimeDeltaPercent,
    attemptsPerSuccessDelta,
  };
};
export class PedagogicalAnalyticsService {
  constructor(
    private readonly repository: PedagogicalAnalyticsRepository = pedagogicalAnalyticsRepository,
  ) {}
  async getForUser(
    userId: string,
    requestedWeeks = 8,
  ): Promise<PedagogicalAnalyticsResponse> {
    const weeks = Math.round(
      clamp(Number.isFinite(requestedWeeks) ? requestedWeeks : 8, 4, 24),
    );
    const [gameHistory, learningEvents] = await Promise.all([
      this.repository.getGameHistory(userId),
      this.repository.getLearningEvents(userId),
    ]);
    const gameIds = gameHistory
      .map((item) => item.gameId)
      .filter((id): id is string => Boolean(id));
    const games = await this.repository.getGamesByIds(gameIds);
    const normalizedGames = gameHistory
      .map((history) =>
        normalizeGameEvidence(
          history,
          history.gameId ? games.get(history.gameId) : undefined,
        ),
      )
      .filter((item): item is PedagogicalEvidenceItem => Boolean(item));
    const normalizedLearning = learningEvents
      .map(normalizeLearningEvidence)
      .filter((item): item is PedagogicalEvidenceItem => Boolean(item));
    const allEvidence = [...normalizedGames, ...normalizedLearning].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );
    const now = new Date();
    const { weekly, from, to } = buildWeekly(allEvidence, weeks, now);
    const evidence = allEvidence.filter(
      (item) => item.occurredAt >= from && item.occurredAt <= to,
    );
    const competencies = buildCompetencies(evidence, now);
    const contents = buildContents(evidence, now);
    const potentialities = [...competencies, ...contents]
      .filter((item) => item.classification === "potentiality")
      .sort((a, b) => b.mastery - a.mastery || b.confidence - a.confidence)
      .slice(0, 6);
    const fragilities = [...competencies, ...contents]
      .filter((item) => item.classification === "fragility")
      .sort((a, b) => a.mastery - b.mastery || b.confidence - a.confidence)
      .slice(0, 6);
    const overall = aggregateOverall(evidence, weekly);
    const improvement = buildImprovement(weekly, evidence.length);
    return {
      period: {
        weeks,
        from: dateKey(from),
        to: dateKey(to),
      },
      overall,
      improvement,
      potentialities,
      fragilities,
      competencies,
      contents,
      weekly,
      generatedAt: now.toISOString(),
    };
  }
}
export const pedagogicalAnalyticsService = new PedagogicalAnalyticsService();
