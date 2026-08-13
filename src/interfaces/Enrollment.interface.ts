// import { Timestamp } from "firebase-admin/firestore";

// export type TEnrollmentStatus = "matriculado" | "concluido" | "cancelado";

// export interface IEnrollment {
//   id: string;

//   userId: string;
//   trailId: string;

//   status: TEnrollmentStatus;

//   progress: number;

//   currentModuleId?: string;
//   currentLessonId?: string;

//   completedModules: number;
//   completedLessons: number;

//   xp: number;

//   startedAt: Timestamp;
//   lastAccessAt?: Timestamp;
//   completedAt?: Timestamp;

//   completedModulesMap: Record<string, true>;
//   completedLessonsMap: Record<string, true>;
// }

import type { Timestamp } from "firebase-admin/firestore";

export interface IEnrollment {
  id: string;
  userId: string;
  trailId: string;
  status: "matriculado" | "concluido" | "cancelado";
  progress: number;
  currentModuleId?: string;
  currentLessonId?: string;
  currentAssessmentId?: string;
  completedModules: number;
  completedLessons: number;
  completedAssessments?: number;
  xp: number;
  startedAt: Timestamp;
  lastAccessAt: Timestamp;
  completedAt?: Timestamp;
  completedModulesMap: Record<string, true>;
  completedLessonsMap: Record<string, true>;
  completedAssessmentsMap?: Record<string, true>;
}
