import { Timestamp } from "firebase-admin/firestore";

export type TSupportStatus =
  | "aberto"
  | "em_andamento"
  | "aguardando_usuario"
  | "resolvido"
  | "fechado";

export type TSupportPriority = "baixa" | "normal" | "alta" | "urgente";

export type TSupportCategory =
  | "geral"
  | "erro_no_sistema"
  | "conta"
  | "pagamento"
  | "sugestao"
  | "outro";

export type TStatusFilter = "all" | TSupportStatus;
export type TCategoryFilter = "all" | TSupportCategory;
export type TPriorityFilter = "all" | TSupportPriority;
export type TSortType = "recent" | "priority" | "title";

export interface ISupportMessage {
  id: string;
  authorType: "usuario" | "administrador" | "system";
  authorId: string;
  text: string;
  createdAt: Timestamp;
}

export interface ISupport {
  id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;

  title: string;
  description: string;

  category: TSupportCategory;
  priority: TSupportPriority;
  status: TSupportStatus;

  messages: ISupportMessage[];

  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastMessageAt?: Timestamp;
  closedAt?: Timestamp | null;
}

/* ============================
   CLASS
============================ */

export class Support implements ISupport {
  id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;

  title: string;
  description: string;

  category: TSupportCategory;
  priority: TSupportPriority;
  status: TSupportStatus;

  attachments?: string[];
  messages: ISupportMessage[];

  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastMessageAt?: Timestamp;
  closedAt?: Timestamp | null;

  constructor(data: Partial<ISupport>) {
    this.id = data.id;

    this.userId = data.userId ?? "";
    this.userName = data.userName;
    this.userEmail = data.userEmail;

    this.title = data.title ?? "Novo Chamado";
    this.description = data.description ?? "";

    this.category = data.category ?? "geral";
    this.priority = data.priority ?? "normal";
    this.status = data.status ?? "aberto";

    this.messages = data.messages ?? [];

    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
    this.lastMessageAt = data.lastMessageAt ?? this.createdAt;
    this.closedAt = data.closedAt ?? null;
  }

  /* ============================
     DOMAIN METHODS
  ============================ */

  update(data: Partial<Omit<ISupport, "id" | "createdAt">>) {
    Object.assign(this, data);
    this.touch();
  }

  addMessage(message: ISupportMessage) {
    this.messages.push(message);
    this.lastMessageAt = Timestamp.now();

    // Se estava aguardando usuário e admin responde
    if (message.authorType === "administrador") {
      this.status = "em_andamento";
    }

    // Se usuário responde e estava resolvido
    if (message.authorType === "usuario" && this.status === "resolvido") {
      this.status = "em_andamento";
    }

    this.touch();
  }

  close() {
    this.status = "fechado";
    this.closedAt = Timestamp.now();
    this.touch();
  }

  resolve() {
    this.status = "resolvido";
    this.touch();
  }

  reopen() {
    this.status = "em_andamento";
    this.closedAt = null;
    this.touch();
  }

  private touch() {
    this.updatedAt = Timestamp.now();
  }

  /* ============================
     FIRESTORE
  ============================ */

  toObject() {
    return {
      id: this.id,
      userId: this.userId,
      userName: this.userName ?? null,
      userEmail: this.userEmail ?? null,
      title: this.title,
      description: this.description,
      category: this.category,
      priority: this.priority,
      status: this.status,
      attachments: this.attachments ?? [],
      messages: this.messages ?? [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt ?? null,
      lastMessageAt: this.lastMessageAt ?? null,
      closedAt: this.closedAt ?? null,
    };
  }

  static fromFirestore(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): Support {
    return new Support({
      id,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      title: data.title,
      description: data.description,
      category: data.category ?? "Geral",
      priority: data.priority ?? "Normal",
      status: data.status ?? "Aberto",
      messages: data.messages ?? [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastMessageAt: data.lastMessageAt,
      closedAt: data.closedAt ?? null,
    });
  }
}
