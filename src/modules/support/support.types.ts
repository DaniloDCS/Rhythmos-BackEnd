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
