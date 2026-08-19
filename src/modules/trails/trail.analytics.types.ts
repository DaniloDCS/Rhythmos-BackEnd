export interface ITrailAdminSummary {
  enrollmentsTotal: number;
  enrollmentsActive: number;
  completedUsers: number;
  cancelledEnrollments: number;
  completionRate: number;
  averageProgress: number;
  inactiveUsers: number;
  healthScore: number;
}

export interface ITrailAnalyticsNamedMetric {
  id: string;
  name: string;
  value: number;
}

export interface ITrailModuleFunnel {
  moduleId: string;
  title: string;
  sequence: number;
  usersReached: number;
  percentage: number;
}

export interface ITrailActivityUsage {
  id: string;
  name: string;
  type: "game" | "simulation" | "lesson" | "other";
  uses: number;
}

export interface ITrailErrorContent {
  id: string;
  name: string;
  type: "game" | "simulation" | "lesson" | "other";
  attempts: number;
  correctAnswers: number;
  wrongAnswers: number;
  errorRate: number;
}

export interface ITrailHealth {
  score: number;
  modulesWithoutLessons: number;
  lessonsWithoutPublishedVersion: number;
  invalidPrerequisites: number;
  nonexistentActivities: number;
  invalidUrls: number;
  warnings: string[];
}

export interface ITrailTrend {
  direction: "up" | "down" | "stable";
  percentage: number;
  currentPeriod: number;
  previousPeriod: number;
}

export interface ITrailAuditItem {
  id: string;
  action: string;
  entityType: "trail" | "module" | "lesson";
  entityId: string;
  actorId?: string | null;
  actorName?: string | null;
  synthetic?: boolean;
  changes?: {
    field: string;
    previous?: unknown;
    current?: unknown;
  }[];
  createdAt?: unknown;
}

export interface ITrailAdminAnalytics {
  enrollmentsTotal: number;
  enrollmentsActive: number;
  completedUsers: number;
  cancelledEnrollments: number;
  completionRate: number;
  averageProgress: number;

  inactiveUsers: number;
  inactivityRate: number;
  inactivityDaysThreshold: number;

  averageCompletionTimeMinutes: number | null;
  lastActivityAt?: unknown;

  mostDroppedModule: ITrailAnalyticsNamedMetric | null;
  mostDroppedLesson: ITrailAnalyticsNamedMetric | null;

  mostCompletedLesson: ITrailAnalyticsNamedMetric | null;
  leastCompletedLesson: ITrailAnalyticsNamedMetric | null;

  moduleFunnel: ITrailModuleFunnel[];

  certificatesIssued: number;

  blockedUsers: number;

  totalXpGenerated: number;
  averageXpGenerated: number;

  mostUsedActivities: ITrailActivityUsage[];

  averageScore: number | null;
  averageAccuracy: number | null;
  averageAttempts: number | null;
  academicPerformance: {
    students: number;
    withNumericAverage: number;
    averageCompletionAverage: number | null;
    averageNormalizedCompletionAverage: number | null;
    averageWorkloadEfficiencyIndex: number | null;
    averagePeriodEfficiencyIndex: number | null;
    averageAcademicEfficiencyIndex: number | null;
    averageNormalizedAcademicEfficiencyIndex: number | null;
    cohortMean: number | null;
    cohortSampleStandardDeviation: number | null;
    cohortSize: number;
  };
  highestErrorContent: ITrailErrorContent | null;

  averageRating: number | null;
  feedbackCount: number;
  complaintCount: number;

  updatedAt?: unknown;
  createdBy?: string | null;
  createdByName?: string | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
  publicationHistory: ITrailAuditItem[];
  changeHistory: ITrailAuditItem[];
  version: number;

  health: ITrailHealth;
  configurationPercent: number;

  inProgressUsers: number;
  completions7d: number;
  completions30d: number;
  newEnrollments7d: number;
  newEnrollments30d: number;
  trend: ITrailTrend;
}
