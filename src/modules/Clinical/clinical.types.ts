import type { Timestamp } from "firebase-admin/firestore";

export const CLINICAL_CASE_XP = 100;

export type ClinicalCaseStatus = "rascunho" | "publicado" | "arquivado";
export type ClinicalStepInputType = "text" | "textarea" | "select" | "number";

export interface IClinicalCaseStep {
  id: string;
  order: number;
  label: string;
  description?: string;
  placeholder?: string;
  type?: ClinicalStepInputType;
  options?: string[];
}

export interface IClinicalCaseECG {
  imageUrl?: string;
  rhythm?: string;
  fc?: number;
  pathological?: string | string[];
  paperSpeed?: number;
  gain?: number;
}

export interface IClinicalCaseInfoItem {
  label: string;
  value: string;
}

export interface IClinicalCaseMetrics {
  attempts: number;
  correctAttempts: number;
  completions: number;
}

export interface IClinicalCase {
  id: string;
  sequence: number;
  title: string;
  shortDescription?: string;
  clinicalCase: string;
  history?: string;
  patient?: string;
  clinicalInfo?: IClinicalCaseInfoItem[];
  ecg: IClinicalCaseECG;
  analysisSteps?: IClinicalCaseStep[];

  correctAnswer: string;
  acceptedAnswers: string[];
  feedbackCorrect?: string;
  feedbackIncorrect?: string;

  status: ClinicalCaseStatus;
  metrics: IClinicalCaseMetrics;

  createdBy?: string;
  updatedBy?: string;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
  publishedAt?: Timestamp | Date | string | null;
}

export interface IClinicalCasePublic {
  id: string;
  sequence: number;
  title: string;
  shortDescription?: string;
  clinicalCase: string;
  history?: string;
  patient?: string;
  clinicalInfo?: IClinicalCaseInfoItem[];
  ecg: IClinicalCaseECG;
  analysisSteps?: IClinicalCaseStep[];
  completed?: boolean;
}

export type ClinicalStepAnswers = Record<string, string>;

export interface IClinicalCaseAttempt {
  id: string;
  userId: string;
  caseId: string;
  analysis: ClinicalStepAnswers;
  answer: string;
  correct: boolean;
  awarded: boolean;
  xpAwarded: number;
  createdAt?: Timestamp | Date | string | null;
}

export interface IClinicalCaseProgress {
  id: string;
  userId: string;
  caseId: string;
  completed: boolean;
  xpAwarded: number;
  firstCorrectAttemptId?: string;
  completedAt?: Timestamp | Date | string | null;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
}

export interface IClinicalCaseAnswerResponse {
  correct: boolean;
  awarded: boolean;
  xpAdded: number;
  feedback: string;
  correctAnswer?: string;
  progress?: unknown;
  levelUp?: boolean;
  level?: {
    previous: number;
    current: number;
    title: string;
    progressPercent: number;
  };
}
