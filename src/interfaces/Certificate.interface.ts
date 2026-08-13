import type { Timestamp } from "firebase-admin/firestore";

export type TCertificateStatus = "valido" | "revogado";

export interface ICertificateLesson {
  id: string;
  title: string;
  sequence: number;

  workloadMinutes?: number;
}

export interface ICertificateModule {
  id: string;
  title: string;
  sequence: number;

  lessons: ICertificateLesson[];

  workloadMinutes?: number;
}

export interface ICertificate {
  id: string;

  enrollmentId: string;
  userId: string;
  trailId: string;

  userName: string;
  trailTitle: string;

  workloadHours?: number;
  workloadMinutes?: number;

  totalModules?: number;
  totalLessons?: number;

  program?: ICertificateModule[];

  status: TCertificateStatus;

  /*
   * Histórico/versionamento
   */
  certificateVersion?: number;
  trailVersion?: number;

  /*
   * Datas
   */
  issuedAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;

  /*
   * Revogação
   */
  revokedAt?: Timestamp;
  revokedBy?: string;
  revocationReason?: string;
}
