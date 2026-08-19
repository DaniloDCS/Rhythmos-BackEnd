import { Timestamp, type DocumentData } from "firebase-admin/firestore";

export type AnnouncementStatus = "draft" | "published" | "archived";
export type AnnouncementPriority = "info" | "important" | "urgent";
export type AnnouncementAudience = "all" | "students" | "administrators";

export class Announcement {
  id?: string;
  title: string;
  description: string;
  status: AnnouncementStatus;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  startsAt?: Timestamp;
  endsAt?: Timestamp;
  actionLabel?: string;
  actionUrl?: string;
  color?: string;
  pinned: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  constructor(data: Partial<Announcement>) {
    this.id = data.id;
    this.title = data.title?.trim() ?? "";
    this.description = data.description?.trim() ?? "";
    this.status = data.status ?? "draft";
    this.priority = data.priority ?? "info";
    this.audience = data.audience ?? "all";
    this.startsAt = data.startsAt;
    this.endsAt = data.endsAt;
    this.actionLabel = data.actionLabel?.trim() ?? "";
    this.actionUrl = data.actionUrl?.trim() ?? "";
    this.color = data.color?.trim() ?? "#2563EB";
    this.pinned = data.pinned ?? false;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
  }

  validate() {
    if (!this.title) throw new Error("O título do comunicado é obrigatório.");
    if (!this.description) throw new Error("A mensagem do comunicado é obrigatória.");
    if (this.startsAt && this.endsAt && this.endsAt.toMillis() <= this.startsAt.toMillis()) {
      throw new Error("O término deve ser posterior ao início da publicação.");
    }
    if (this.actionUrl && !this.actionLabel) {
      throw new Error("Informe o texto do botão de ação.");
    }
  }

  toObject() {
    return {
      id: this.id ?? null,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      audience: this.audience,
      startsAt: this.startsAt ?? null,
      endsAt: this.endsAt ?? null,
      actionLabel: this.actionLabel || null,
      actionUrl: this.actionUrl || null,
      color: this.color || "#2563EB",
      pinned: this.pinned,
      createdBy: this.createdBy ?? null,
      updatedBy: this.updatedBy ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt ?? null,
    };
  }

  static fromFirestore(id: string, data: DocumentData) {
    return new Announcement({ id, ...data });
  }
}
