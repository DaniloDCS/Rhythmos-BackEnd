export type PedagogicalEvidenceSource =
  | "game"
  | "simulation"
  | "exercise"
  | "quiz";

export type PedagogicalTrend =
  | "improving"
  | "stable"
  | "declining"
  | "insufficient_data";

export type PedagogicalClassification =
  | "potentiality"
  | "developing"
  | "fragility"
  | "insufficient_data";

export interface PedagogicalCompetencyDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
}

export interface PedagogicalEvidenceItem {
  id: string;
  userId: string;
  sourceType: PedagogicalEvidenceSource;
  sourceId: string;
  sourceName: string;

  occurredAt: Date;

  score: number | null;
  correctAnswers: number | null;
  totalAnswers: number | null;
  accuracy: number | null;
  performance: number;

  timeSeconds: number;
  attempt: number;
  successful: boolean;

  contentTags: string[];
  competencyIds: string[];

  /**
   * Evidências granulares opcionais enviadas por jogos/exercícios.
   * Ex.: acerto/erro em "fibrilação atrial" ou "intervalo PR".
   */
  details: PedagogicalEvidenceDetail[];
}

export interface PedagogicalEvidenceDetail {
  contentId?: string;
  contentName: string;
  competencyIds?: string[];
  correct?: boolean;
  score?: number;
}

export interface PedagogicalWeeklyPoint {
  weekIndex: number;
  label: string;
  startDate: string;
  endDate: string;

  activities: number;
  successfulActivities: number;

  correctAnswers: number;
  totalAnswers: number;
  accuracy: number | null;

  averagePerformance: number | null;

  totalPracticeSeconds: number;
  averageTimeSeconds: number | null;

  attempts: number;
  attemptsPerSuccess: number | null;
}

export interface PedagogicalDimensionSummary {
  id: string;
  name: string;
  kind: "competency" | "content";

  icon?: string;
  description?: string;

  mastery: number;
  accuracy: number | null;
  averagePerformance: number;

  attempts: number;
  correctAnswers: number;
  totalAnswers: number;
  practiceSeconds: number;

  trend: PedagogicalTrend;
  delta: number;

  classification: PedagogicalClassification;
  confidence: number;

  lastActivityAt?: string | null;
}

export interface PedagogicalOverallSummary {
  activities: number;
  successfulActivities: number;

  correctAnswers: number;
  totalAnswers: number;
  accuracy: number | null;

  averagePerformance: number | null;
  totalPracticeSeconds: number;
  averageTimeSeconds: number | null;

  attempts: number;
  attemptsPerSuccess: number | null;

  activeWeeks: number;
}

export interface PedagogicalImprovementSummary {
  trend: PedagogicalTrend;
  isImproving: boolean | null;

  headline: string;
  detail: string;

  confidence: number;

  accuracyDelta: number | null;
  performanceDelta: number | null;
  averageTimeDeltaPercent: number | null;
  attemptsPerSuccessDelta: number | null;
}

export interface PedagogicalAnalyticsResponse {
  period: {
    weeks: number;
    from: string;
    to: string;
  };

  overall: PedagogicalOverallSummary;
  improvement: PedagogicalImprovementSummary;

  potentialities: PedagogicalDimensionSummary[];
  fragilities: PedagogicalDimensionSummary[];

  competencies: PedagogicalDimensionSummary[];
  contents: PedagogicalDimensionSummary[];

  weekly: PedagogicalWeeklyPoint[];

  generatedAt: string;
}
