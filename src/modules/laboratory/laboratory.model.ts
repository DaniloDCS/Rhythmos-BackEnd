import { Timestamp } from "firebase-admin/firestore";
import type {
  ILaboratoryModule,
  LaboratoryModuleStatus,
} from "./laboratory.types";

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeStatus = (value: unknown): LaboratoryModuleStatus => {
  if (
    value === "disponivel" ||
    value === "indisponivel" ||
    value === "em_construcao"
  ) {
    return value;
  }
  return "em_construcao";
};

export class LaboratoryModule implements ILaboratoryModule {
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

  constructor(data: Partial<ILaboratoryModule>) {
    this.id = String(data.id ?? "").trim();
    this.name = String(data.name ?? "").trim();
    this.slug = slugify(String(data.slug || data.name || ""));
    this.description = String(data.description ?? "").trim();
    this.icon =
      String(data.icon ?? "fi fi-rr-flask").trim() || "fi fi-rr-flask";
    this.tag = String(data.tag ?? "Simulação").trim() || "Simulação";
    this.status = normalizeStatus(data.status);
    this.sequence = Math.max(0, Number(data.sequence ?? 0));
    this.featured =
      data.featured === true || String(data.featured).toLowerCase() === "true";
    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
  }

  validate() {
    if (!this.id) throw new Error("O ID do módulo é obrigatório.");
    if (!this.name) throw new Error("O nome do módulo é obrigatório.");
    if (!this.slug) throw new Error("O slug do módulo é obrigatório.");
  }

  toObject() {
    return Object.fromEntries(
      Object.entries(this).filter(([, value]) => value !== undefined),
    ) as Omit<ILaboratoryModule, "updatedAt"> & {
      updatedAt?: Timestamp;
    };
  }
}
