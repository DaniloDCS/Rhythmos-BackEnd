export const calculateEnrollmentProgress = (completed: number, total: number) => total <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
export const calculateXpAward = (baseXp: number, alreadyAwarded: boolean, dailyLimit?: number, awardedToday = 0) => alreadyAwarded ? 0 : Math.max(0, Math.min(Math.max(0, baseXp), dailyLimit == null ? baseXp : Math.max(0, dailyLimit - awardedToday)));
export const isRewardEligible = (currentValue: number, targetValue: number, active = true) => active && Number.isFinite(currentValue) && currentValue >= Math.max(0, targetValue);
export const isCertificateValid = (status: string, revokedAt?: unknown) => status === "valido" && !revokedAt;
export const canConcludeEnrollment = (completedLessons: number, totalLessons: number, requiredAssessmentsPassed = true) => totalLessons > 0 && completedLessons >= totalLessons && requiredAssessmentsPassed;
