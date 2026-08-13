import type { IEnrollment } from "./Enrollment.interface";

export type LearningStep =
  | { type: "lesson"; lessonId: string }
  | { type: "practice"; lessonId: string }
  | { type: "assessment"; assessmentId: string }
  | { type: "complete" };

export interface LearningFlowResult {
  enrollment: IEnrollment & {
    currentAssessmentId?: string;
    completedAssessmentsMap?: Record<string, true>;
    completedAssessments?: number;
  };
  nextStep: LearningStep;
  newlyCompletedLesson?: boolean;
  newlyCompletedAssessment?: boolean;
  newlyCompletedModule?: boolean;
  trailCompleted?: boolean;
}
