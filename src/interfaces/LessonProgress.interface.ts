import { Timestamp } from "firebase-admin/firestore";

export type TLessonProgressStatus = "nao_iniciada" | "andamento" | "concluida";

export interface ILessonProgress {
  id: string;

  uid: string;

  enrollmentId: string;

  trailId: string;
  moduleId: string;
  lessonId: string;

  status: TLessonProgressStatus;

  /** 0 a 100 */
  progress: number;

  /** Tempo estudado (segundos) */
  timeSpent: number;

  /** Última posição da leitura (%) */
  lastPosition: number;

  xpEarned: number;

  startedAt?: Timestamp;
  lastAccessAt?: Timestamp;
  completedAt?: Timestamp;
}
