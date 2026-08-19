import type { Timestamp } from "firebase-admin/firestore";
import type { AcademicIndices } from "./academic-indices.service";

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
  academicIndices?: AcademicIndices;
}
