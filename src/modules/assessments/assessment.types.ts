import { Timestamp } from "firebase-admin/firestore";

export type AssessmentScope = "lesson" | "module";

export type AssessmentStatus = "rascunho" | "disponivel";

export type AssessmentQuestionType = "single" | "multiple" | "true_false";

export interface IAssessmentOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface IAssessmentQuestion {
  id: string;
  type: AssessmentQuestionType;
  prompt: string;
  points: number;
  options: IAssessmentOption[];
  explanation?: string;
  contentTags?: string[];
  competencyIds?: string[];
}

export interface IAssessment {
  id: string;
  trailId: string;
  moduleId: string;
  lessonId?: string;
  scope: AssessmentScope;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts?: number;
  required: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: IAssessmentQuestion[];
  status: AssessmentStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
