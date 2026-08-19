import type { Timestamp } from "firebase-admin/firestore";

export type LaboratoryModuleStatus =
  | "disponivel"
  | "indisponivel"
  | "em_construcao";

export interface ILaboratoryModule {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  tag: string;
  status: LaboratoryModuleStatus;
  sequence: number;
  featured: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
