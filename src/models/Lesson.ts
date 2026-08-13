// import { Timestamp, type DocumentData } from "firebase-admin/firestore";
// import { TStatus, TLevel, TVisibility } from ".";

// export type LessonType =
//   | "Texto"
//   | "Vídeo"
//   | "Quiz"
//   | "Jogo"
//   | "Simulação"
//   | "PDF"
//   | "Áudio"
//   | "Misto";

// export type BlockType =
//   | "Título"
//   | "Parágrafo"
//   | "Divisor"
//   | "Imagem"
//   | "Vídeo"
//   | "Link"
//   | "Arquivo"
//   | "Tabela"
//   | "Enquete"
//   | "Questão";

// export interface IBlock {
//   id: string;
//   type: BlockType;
//   content: string;
// }

// export interface ILessonAttachment {
//   name: string;
//   url: string;
//   type?: string;
// }

// export interface ILessonMetrics {
//   views: number;
//   starts: number;
//   completions: number;
//   dropouts: number;
//   averageProgress: number;
//   averageScore: number;
//   averageCompletionTimeMinutes: number;
//   averageWatchTimeMinutes: number;
//   lastAccessAt?: Timestamp;
// }

// export interface IChangeLogEntry {
//   version: number;
//   data: Partial<ILesson>;
//   updatedAt: Timestamp;
// }

// export interface ILesson {
//   id?: string;
//   moduleId: string;

//   title: string;
//   slug?: string;
//   shortDescription?: string;
//   summary?: string;

//   content: IBlock[];

//   sequence: number;
//   status: TStatus;
//   level?: TLevel;
//   type?: LessonType;
//   category?: string;
//   tags?: string[];

//   prerequisiteLessonIds: string[];

//   /** Recompensas concedidas quando a aula é concluída. */
//   completionRewardIds?: string[];

//   videoUrl?: string;
//   thumbnailUrl?: string;
//   attachments?: ILessonAttachment[];

//   durationInMinutes?: number;
//   estimatedMinutes?: number;
//   readingTimeMinutes?: number;

//   hasVideo?: boolean;
//   hasText?: boolean;
//   hasAttachments?: boolean;

//   published: boolean;
//   publishedAt?: Timestamp;
//   unpublishedAt?: Timestamp;
//   archived?: boolean;
//   featured?: boolean;
//   visibility?: TVisibility;

//   createdBy?: string;
//   updatedBy?: string;
//   responsibleInstructorId?: string;
//   version?: number;
//   changeLog?: IChangeLogEntry[];

//   metrics?: ILessonMetrics;

//   createdAt: Timestamp;
//   updatedAt?: Timestamp;
//   currentVersionId: string;
// }

// export class Lesson implements ILesson {
//   id?: string;

//   moduleId: string;

//   title: string;
//   slug?: string;
//   shortDescription?: string;
//   summary?: string;
//   content: IBlock[];

//   sequence: number;
//   status: TStatus;
//   level?: TLevel;
//   type?: LessonType;
//   category?: string;
//   tags?: string[];

//   prerequisiteLessonIds: string[];

//   completionRewardIds?: string[];

//   videoUrl?: string;
//   thumbnailUrl?: string;
//   attachments?: ILessonAttachment[];

//   durationInMinutes?: number;
//   estimatedMinutes?: number;
//   readingTimeMinutes?: number;

//   hasVideo?: boolean;
//   hasText?: boolean;
//   hasAttachments?: boolean;

//   published: boolean;
//   publishedAt?: Timestamp;
//   unpublishedAt?: Timestamp;
//   archived?: boolean;
//   featured?: boolean;
//   visibility?: TVisibility;

//   createdBy?: string;
//   updatedBy?: string;
//   responsibleInstructorId?: string;
//   version?: number;
//   changeLog?: IChangeLogEntry[];

//   metrics?: ILessonMetrics;

//   createdAt: Timestamp;
//   updatedAt?: Timestamp;
//   currentVersionId: string;

//   constructor(data: Partial<ILesson>) {
//     this.id = data.id;

//     this.moduleId = this.safeString(data.moduleId).trim();

//     this.title = this.safeString(data.title).trim() || "Nova Aula";
//     this.slug = this.safeString(data.slug) || this.generateSlug(this.title);
//     this.shortDescription = this.safeString(data.shortDescription).trim();
//     this.summary = this.safeString(data.summary).trim();

//     this.content = data.content ?? [];

//     this.sequence = data.sequence ?? 1;
//     this.status = data.status ?? "em_construcao";
//     this.level = data.level ?? "basico";
//     this.type = data.type ?? "Texto";
//     this.category = this.safeString(data.category).trim();

//     this.tags = data.tags ?? [];

//     this.prerequisiteLessonIds = data.prerequisiteLessonIds ?? [];
//     this.completionRewardIds = [
//       ...new Set(
//         (data.completionRewardIds ?? []).map((id) => id.trim()).filter(Boolean),
//       ),
//     ];

//     this.videoUrl = this.safeString(data.videoUrl);
//     this.thumbnailUrl = this.safeString(data.thumbnailUrl);

//     this.attachments = data.attachments ?? [];

//     this.durationInMinutes = data.durationInMinutes ?? 0;
//     this.estimatedMinutes =
//       data.estimatedMinutes ?? data.durationInMinutes ?? 0;
//     this.readingTimeMinutes = data.readingTimeMinutes ?? 0;

//     this.hasVideo = data.hasVideo ?? Boolean(data.videoUrl);
//     this.hasText = (this.content?.length ?? 0) > 0;
//     this.hasAttachments = (this.attachments?.length ?? 0) > 0;

//     this.published = data.published ?? false;
//     this.publishedAt = data.publishedAt;
//     this.unpublishedAt = data.unpublishedAt;
//     this.archived = data.archived ?? false;
//     this.featured = data.featured ?? false;
//     this.visibility = data.visibility ?? "publica";

//     this.createdBy = data.createdBy;
//     this.updatedBy = data.updatedBy;
//     this.responsibleInstructorId = data.responsibleInstructorId;

//     this.version = data.version ?? 1;
//     this.changeLog = data.changeLog ?? [];

//     this.metrics = {
//       views: data.metrics?.views ?? 0,
//       starts: data.metrics?.starts ?? 0,
//       completions: data.metrics?.completions ?? 0,
//       dropouts: data.metrics?.dropouts ?? 0,
//       averageProgress: data.metrics?.averageProgress ?? 0,
//       averageScore: data.metrics?.averageScore ?? 0,
//       averageCompletionTimeMinutes:
//         data.metrics?.averageCompletionTimeMinutes ?? 0,
//       averageWatchTimeMinutes: data.metrics?.averageWatchTimeMinutes ?? 0,
//       lastAccessAt: data.metrics?.lastAccessAt,
//     };

//     this.createdAt = data.createdAt ?? Timestamp.now();
//     this.updatedAt = data.updatedAt;
//     this.currentVersionId = data.currentVersionId ?? "";
//   }

//   private safeString(v: any): string {
//     return v ?? "";
//   }

//   // ======================
//   // Publish / Unpublish
//   // ======================
//   publish(userId?: string) {
//     this.validateBeforePublish();
//     this.published = true;
//     this.publishedAt = Timestamp.now();
//     this.unpublishedAt = undefined;
//     this.status = "disponivel";
//     if (userId) this.updatedBy = userId;
//     this.touch();
//   }

//   unpublish(userId?: string) {
//     this.published = false;
//     this.unpublishedAt = Timestamp.now();
//     if (this.status === "disponivel") this.status = "indisponivel";
//     if (userId) this.updatedBy = userId;
//     this.touch();
//   }

//   archive(userId?: string) {
//     this.archived = true;
//     this.published = false;
//     this.unpublishedAt = Timestamp.now();
//     if (userId) this.updatedBy = userId;
//     this.touch();
//   }

//   unarchive(userId?: string) {
//     this.archived = false;
//     if (userId) this.updatedBy = userId;
//     this.touch();
//   }

//   setFeatured(featured: boolean, userId?: string) {
//     this.featured = featured;
//     if (userId) this.updatedBy = userId;
//     this.touch();
//   }

//   // ======================
//   // Update + ChangeLog
//   // ======================
//   update(
//     data: Partial<Omit<ILesson, "id" | "createdAt" | "metrics" | "changeLog">>,
//     userId?: string,
//   ) {
//     const snapshot: Partial<ILesson> = {
//       moduleId: this.moduleId,
//       title: this.title,
//       slug: this.slug,
//       content: this.content,
//       sequence: this.sequence,
//       status: this.status,
//       updatedAt: this.updatedAt,
//     };

//     // inicializa array se não existir
//     if (!Array.isArray(this.changeLog)) {
//       this.changeLog = [];
//     }

//     // adiciona snapshot ao changeLog
//     this.changeLog.push({
//       version: this.version ?? 1,
//       data: snapshot,
//       updatedAt: Timestamp.now(),
//     });

//     // aplica atualização
//     const oldTitle = this.title;
//     Object.assign(this, data);

//     this.title = this.title?.trim() || oldTitle;
//     this.slug = data.slug?.trim() || this.generateSlug(this.title);
//     this.shortDescription = this.shortDescription?.trim() ?? "";
//     this.summary = this.summary?.trim() ?? "";
//     this.category = this.category?.trim() ?? "";

//     this.attachments = this.attachments ?? [];

//     this.hasVideo = Boolean(this.videoUrl);
//     this.hasText = (this.content?.length ?? 0) > 0;
//     this.hasAttachments = this.attachments.length > 0;

//     if (userId) {
//       this.updatedBy = userId;
//       this.createdBy = this.createdBy || "";
//       this.responsibleInstructorId = this.responsibleInstructorId || "";
//     }

//     this.version = (this.version ?? 1) + 1;
//     this.validate();
//     this.touch();
//   }

//   // ======================
//   // Prerequisites / Tags / Attachments
//   // ======================
//   addPrerequisite(lessonId: string) {
//     const normalized = lessonId.trim();
//     if (!normalized) return;
//     if (this.id && normalized === this.id)
//       throw new Error("A aula não pode ser pré-requisito dela mesma.");
//     if (!this.prerequisiteLessonIds.includes(normalized)) {
//       this.prerequisiteLessonIds.push(normalized);
//       this.touch();
//     }
//   }

//   removePrerequisite(lessonId: string) {
//     this.prerequisiteLessonIds = this.prerequisiteLessonIds.filter(
//       (id) => id !== lessonId,
//     );
//     this.touch();
//   }

//   addTag(tag: string) {
//     const normalized = tag.trim();
//     if (!normalized) return;
//     if (!this.tags?.includes(normalized)) {
//       this.tags = [...(this.tags ?? []), normalized];
//       this.touch();
//     }
//   }

//   removeTag(tag: string) {
//     this.tags = (this.tags ?? []).filter((item) => item !== tag);
//     this.touch();
//   }

//   addAttachment(attachment: ILessonAttachment) {
//     if (!attachment?.name?.trim() || !attachment?.url?.trim())
//       throw new Error("Anexo inválido.");
//     this.attachments = this.attachments ?? [];
//     this.attachments.push({
//       name: attachment.name.trim(),
//       url: attachment.url.trim(),
//       type: attachment.type?.trim(),
//     });
//     this.hasAttachments = true;
//     this.touch();
//   }

//   removeAttachment(url: string) {
//     this.attachments = (this.attachments ?? []).filter((a) => a.url !== url);
//     this.hasAttachments = this.attachments.length > 0;
//     this.touch();
//   }

//   // ======================
//   // Access / Metrics
//   // ======================
//   canUserAccess(completedLessonIds: string[]): boolean {
//     if (!this.published || this.archived || this.visibility === "privada")
//       return false;
//     if (!this.prerequisiteLessonIds.length) return true;
//     return this.prerequisiteLessonIds.every((id) =>
//       completedLessonIds.includes(id),
//     );
//   }

//   incrementViews() {
//     this.ensureMetrics();
//     this.metrics!.views += 1;
//     this.metrics!.lastAccessAt = Timestamp.now();
//     this.touch();
//   }

//   incrementStarts() {
//     this.ensureMetrics();
//     this.metrics!.starts += 1;
//     this.touch();
//   }

//   incrementCompletions() {
//     this.ensureMetrics();
//     this.metrics!.completions += 1;
//     this.touch();
//   }

//   incrementDropouts() {
//     this.ensureMetrics();
//     this.metrics!.dropouts += 1;
//     this.touch();
//   }

//   setAverageProgress(value: number) {
//     this.ensureMetrics();
//     this.metrics!.averageProgress = this.clamp(value, 0, 100);
//     this.touch();
//   }

//   setAverageScore(value: number) {
//     this.ensureMetrics();
//     this.metrics!.averageScore = this.clamp(value, 0, 100);
//     this.touch();
//   }

//   setAverageCompletionTimeMinutes(value: number) {
//     this.ensureMetrics();
//     this.metrics!.averageCompletionTimeMinutes = Math.max(0, value);
//     this.touch();
//   }

//   setAverageWatchTimeMinutes(value: number) {
//     this.ensureMetrics();
//     this.metrics!.averageWatchTimeMinutes = Math.max(0, value);
//     this.touch();
//   }

//   getCompletionRate(): number {
//     const starts = this.metrics?.starts ?? 0;
//     const completions = this.metrics?.completions ?? 0;
//     if (starts <= 0) return 0;
//     return Number(((completions / starts) * 100).toFixed(2));
//   }

//   getDropoutRate(): number {
//     const starts = this.metrics?.starts ?? 0;
//     const dropouts = this.metrics?.dropouts ?? 0;
//     if (starts <= 0) return 0;
//     return Number(((dropouts / starts) * 100).toFixed(2));
//   }

//   // ======================
//   // Validation
//   // ======================
//   validate() {
//     if (!this.moduleId.trim())
//       throw new Error("O moduleId da aula é obrigatório.");
//     if (!this.title.trim()) throw new Error("O título da aula é obrigatório.");
//     if (this.sequence < 1)
//       throw new Error("A sequência da aula deve ser maior ou igual a 1.");
//     if ((this.durationInMinutes ?? 0) < 0)
//       throw new Error("A duração da aula não pode ser negativa.");
//     if ((this.estimatedMinutes ?? 0) < 0)
//       throw new Error("O tempo estimado não pode ser negativo.");
//     if ((this.readingTimeMinutes ?? 0) < 0)
//       throw new Error("O tempo de leitura não pode ser negativo.");
//     if (this.id && this.prerequisiteLessonIds.includes(this.id))
//       throw new Error("A aula não pode ser pré-requisito dela mesma.");

//     if (this.metrics) {
//       this.metrics.views = Math.max(0, this.metrics.views);
//       this.metrics.starts = Math.max(0, this.metrics.starts);
//       this.metrics.completions = Math.max(0, this.metrics.completions);
//       this.metrics.dropouts = Math.max(0, this.metrics.dropouts);
//       this.metrics.averageProgress = this.clamp(
//         this.metrics.averageProgress,
//         0,
//         100,
//       );
//       this.metrics.averageScore = this.clamp(this.metrics.averageScore, 0, 100);
//       this.metrics.averageCompletionTimeMinutes = Math.max(
//         0,
//         this.metrics.averageCompletionTimeMinutes,
//       );
//       this.metrics.averageWatchTimeMinutes = Math.max(
//         0,
//         this.metrics.averageWatchTimeMinutes,
//       );
//     }
//   }

//   validateBeforePublish() {
//     this.validate();
//     if (this.archived)
//       throw new Error("Não é possível publicar uma aula arquivada.");

//     const hasText = (this.content?.length ?? 0) > 0;
//     const hasSomeContent =
//       hasText ||
//       Boolean(this.videoUrl?.trim()) ||
//       (this.attachments?.length ?? 0) > 0;

//     if (!hasSomeContent)
//       throw new Error(
//         "A aula precisa ter conteúdo em texto, vídeo ou anexo para ser publicada.",
//       );
//   }

//   // ======================
//   // Helpers
//   // ======================
//   private touch() {
//     this.updatedAt = Timestamp.now();
//   }

//   private ensureMetrics() {
//     if (!this.metrics) {
//       this.metrics = {
//         views: 0,
//         starts: 0,
//         completions: 0,
//         dropouts: 0,
//         averageProgress: 0,
//         averageScore: 0,
//         averageCompletionTimeMinutes: 0,
//         averageWatchTimeMinutes: 0,
//       };
//     }
//   }

//   private clamp(value: number, min: number, max: number) {
//     return Math.min(Math.max(value, min), max);
//   }

//   private generateSlug(text: string): string {
//     return text
//       .normalize("NFD")
//       .replace(/[\u0300-\u036f]/g, "")
//       .toLowerCase()
//       .trim()
//       .replace(/[^\w\s-]/g, "")
//       .replace(/\s+/g, "-")
//       .replace(/-+/g, "-");
//   }

//   toObject() {
//     const cleanDate = (value: any) => {
//       if (!value) return null;
//       if (value instanceof Date) return value;
//       if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
//       return value;
//     };

//     return {
//       id: this.id || "",
//       moduleId: this.moduleId,
//       title: this.title,
//       slug: this.slug,
//       shortDescription: this.shortDescription,
//       summary: this.summary,
//       content: this.content ?? [],
//       sequence: this.sequence,
//       status: this.status,
//       level: this.level,
//       type: this.type ?? "Texto",
//       category: this.category,
//       tags: this.tags ?? [],
//       prerequisiteLessonIds: this.prerequisiteLessonIds ?? [],
//       completionRewardIds: this.completionRewardIds ?? [],
//       videoUrl: this.videoUrl ?? "",
//       thumbnailUrl: this.thumbnailUrl ?? "",
//       attachments: this.attachments ?? [],
//       durationInMinutes: this.durationInMinutes ?? 0,
//       estimatedMinutes: this.estimatedMinutes ?? 0,
//       readingTimeMinutes: this.readingTimeMinutes ?? 0,
//       hasVideo: this.hasVideo ?? false,
//       hasText: this.hasText ?? false,
//       hasAttachments: this.hasAttachments ?? false,
//       published: this.published ?? false,
//       publishedAt: cleanDate(this.publishedAt),
//       unpublishedAt: cleanDate(this.unpublishedAt),
//       archived: this.archived ?? false,
//       featured: this.featured ?? false,
//       visibility: this.visibility ?? "Pública",
//       createdBy: this.createdBy || "",
//       updatedBy: this.updatedBy || "",
//       responsibleInstructorId: this.responsibleInstructorId || "",
//       version: this.version ?? 1,
//       changeLog: this.changeLog ?? [],
//       metrics: this.metrics
//         ? {
//             views: this.metrics.views ?? 0,
//             starts: this.metrics.starts ?? 0,
//             completions: this.metrics.completions ?? 0,
//             dropouts: this.metrics.dropouts ?? 0,
//             averageProgress: this.metrics.averageProgress ?? 0,
//             averageScore: this.metrics.averageScore ?? 0,
//             averageCompletionTimeMinutes:
//               this.metrics.averageCompletionTimeMinutes ?? 0,
//             averageWatchTimeMinutes: this.metrics.averageWatchTimeMinutes ?? 0,
//             lastAccessAt: cleanDate(this.metrics.lastAccessAt),
//           }
//         : {
//             views: 0,
//             starts: 0,
//             completions: 0,
//             dropouts: 0,
//             averageProgress: 0,
//             averageScore: 0,
//             averageCompletionTimeMinutes: 0,
//             averageWatchTimeMinutes: 0,
//             lastAccessAt: null,
//           },
//       createdAt: cleanDate(this.createdAt),
//       updatedAt: cleanDate(this.updatedAt),
//     };
//   }

//   static fromFirestore(id: string, data: DocumentData): Lesson {
//     return new Lesson({
//       id,
//       moduleId: data.moduleId,
//       title: data.title,
//       slug: data.slug,
//       shortDescription: data.shortDescription,
//       summary: data.summary,
//       content: data.content ?? [],
//       sequence: data.sequence ?? 1,
//       status: data.status ?? "Em construção",
//       level: data.level,
//       type: data.type ?? "Texto",
//       category: data.category,
//       tags: data.tags ?? [],
//       prerequisiteLessonIds: data.prerequisiteLessonIds ?? [],
//       completionRewardIds: data.completionRewardIds ?? [],
//       videoUrl: data.videoUrl || "",
//       thumbnailUrl: data.thumbnailUrl,
//       attachments: data.attachments ?? [],
//       durationInMinutes: data.durationInMinutes ?? 0,
//       estimatedMinutes: data.estimatedMinutes ?? 0,
//       readingTimeMinutes: data.readingTimeMinutes ?? 0,
//       hasVideo: data.hasVideo ?? false,
//       hasText: data.hasText ?? false,
//       hasAttachments: data.hasAttachments ?? false,
//       published: data.published ?? false,
//       publishedAt: data.publishedAt,
//       unpublishedAt: data.unpublishedAt,
//       archived: data.archived ?? false,
//       featured: data.featured ?? false,
//       visibility: data.visibility ?? "Pública",
//       createdBy: data.createdBy,
//       updatedBy: data.updatedBy,
//       responsibleInstructorId: data.responsibleInstructorId,
//       version: data.version ?? 1,
//       changeLog: data.changeLog ?? [],
//       metrics: data.metrics,
//       createdAt: data.createdAt ?? Timestamp.now(),
//       updatedAt: data.updatedAt,
//       currentVersionId: data.currentVersionId,
//     });
//   }
// }

// export interface ILesson2 {
//   id: string;
//   moduleId: string;
//   sequence: number;
//   currentVersionId?: string;
//   publishedVersionId?: string;
//   hasDraft?: boolean;
//   versionsCount?: number;
//   completionRewardIds?: string[];
//   status:
//     | "disponivel"
//     | "indisponivel"
//     | "em_construcao"
//     | "em_revisao"
//     | "em_edicao";
//   createdBy?: string;
//   updatedBy?: string;
//   createdAt: Timestamp;
//   updatedAt?: Timestamp;
// }

// export interface ILessonVersion2 {
//   id: string;
//   lessonId: string;
//   version: number;
//   status: "rascunho" | "publicada";
//   title: string;
//   slug?: string;
//   summary?: string;
//   content: IBlock[];
//   type?: LessonType;
//   tags?: string[];
//   prerequisiteLessonIds: string[];
//   durationInMinutes?: number;
//   visibility?: "publica" | "privada" | "restrita";
//   publishedAt?: Timestamp;
//   publishedBy?: string;
//   createdBy?: string;
//   createdAt: Timestamp;
//   updatedAt: Timestamp;
// }

import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { TStatus, TLevel, TVisibility } from ".";
import { IBlock } from "../interfaces/Block.interface";

export type LessonType =
  | "Texto"
  | "Vídeo"
  | "Quiz"
  | "Jogo"
  | "Simulação"
  | "PDF"
  | "Áudio"
  | "Misto";

export interface ILessonAttachment {
  name: string;
  url: string;
  type?: string;
}

export interface ILessonMetrics {
  views: number;
  starts: number;
  completions: number;
  dropouts: number;
  averageProgress: number;
  averageScore: number;
  averageCompletionTimeMinutes: number;
  averageWatchTimeMinutes: number;
  lastAccessAt?: Timestamp;
}

export interface IChangeLogEntry {
  version: number;
  data: Partial<ILesson>;
  updatedAt: Timestamp;
}

export interface ILesson {
  id?: string;
  moduleId: string;

  title: string;
  slug?: string;
  shortDescription?: string;
  summary?: string;

  content: IBlock[];

  sequence: number;
  status: TStatus;
  level?: TLevel;
  type?: LessonType;
  category?: string;
  tags?: string[];

  prerequisiteLessonIds: string[];

  /** Recompensas concedidas quando a aula é concluída. */
  completionRewardIds?: string[];

  videoUrl?: string;
  thumbnailUrl?: string;
  attachments?: ILessonAttachment[];

  durationInMinutes?: number;
  estimatedMinutes?: number;
  readingTimeMinutes?: number;

  hasVideo?: boolean;
  hasText?: boolean;
  hasAttachments?: boolean;

  published: boolean;
  publishedAt?: Timestamp;
  unpublishedAt?: Timestamp;
  archived?: boolean;
  featured?: boolean;
  visibility?: TVisibility;

  createdBy?: string;
  updatedBy?: string;
  responsibleInstructorId?: string;
  version?: number;
  changeLog?: IChangeLogEntry[];

  metrics?: ILessonMetrics;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
  currentVersionId: string;
}

export class Lesson implements ILesson {
  id?: string;

  moduleId: string;

  title: string;
  slug?: string;
  shortDescription?: string;
  summary?: string;
  content: IBlock[];

  sequence: number;
  status: TStatus;
  level?: TLevel;
  type?: LessonType;
  category?: string;
  tags?: string[];

  prerequisiteLessonIds: string[];

  completionRewardIds?: string[];

  videoUrl?: string;
  thumbnailUrl?: string;
  attachments?: ILessonAttachment[];

  durationInMinutes?: number;
  estimatedMinutes?: number;
  readingTimeMinutes?: number;

  hasVideo?: boolean;
  hasText?: boolean;
  hasAttachments?: boolean;

  published: boolean;
  publishedAt?: Timestamp;
  unpublishedAt?: Timestamp;
  archived?: boolean;
  featured?: boolean;
  visibility?: TVisibility;

  createdBy?: string;
  updatedBy?: string;
  responsibleInstructorId?: string;
  version?: number;
  changeLog?: IChangeLogEntry[];

  metrics?: ILessonMetrics;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
  currentVersionId: string;

  constructor(data: Partial<ILesson>) {
    this.id = data.id;

    this.moduleId = this.safeString(data.moduleId).trim();

    this.title = this.safeString(data.title).trim() || "Nova Aula";
    this.slug = this.safeString(data.slug) || this.generateSlug(this.title);
    this.shortDescription = this.safeString(data.shortDescription).trim();
    this.summary = this.safeString(data.summary).trim();

    this.content = data.content ?? [];

    this.sequence = data.sequence ?? 1;
    this.status = data.status ?? "em_construcao";
    this.level = data.level ?? "basico";
    this.type = data.type ?? "Texto";
    this.category = this.safeString(data.category).trim();

    this.tags = data.tags ?? [];

    this.prerequisiteLessonIds = data.prerequisiteLessonIds ?? [];
    this.completionRewardIds = [
      ...new Set(
        (data.completionRewardIds ?? []).map((id) => id.trim()).filter(Boolean),
      ),
    ];

    this.videoUrl = this.safeString(data.videoUrl);
    this.thumbnailUrl = this.safeString(data.thumbnailUrl);

    this.attachments = data.attachments ?? [];

    this.durationInMinutes = data.durationInMinutes ?? 0;
    this.estimatedMinutes =
      data.estimatedMinutes ?? data.durationInMinutes ?? 0;
    this.readingTimeMinutes = data.readingTimeMinutes ?? 0;

    this.hasVideo = data.hasVideo ?? Boolean(data.videoUrl);
    this.hasText = (this.content?.length ?? 0) > 0;
    this.hasAttachments = (this.attachments?.length ?? 0) > 0;

    this.published = data.published ?? false;
    this.publishedAt = data.publishedAt;
    this.unpublishedAt = data.unpublishedAt;
    this.archived = data.archived ?? false;
    this.featured = data.featured ?? false;
    this.visibility = data.visibility ?? "publica";

    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.responsibleInstructorId = data.responsibleInstructorId;

    this.version = data.version ?? 1;
    this.changeLog = data.changeLog ?? [];

    this.metrics = {
      views: data.metrics?.views ?? 0,
      starts: data.metrics?.starts ?? 0,
      completions: data.metrics?.completions ?? 0,
      dropouts: data.metrics?.dropouts ?? 0,
      averageProgress: data.metrics?.averageProgress ?? 0,
      averageScore: data.metrics?.averageScore ?? 0,
      averageCompletionTimeMinutes:
        data.metrics?.averageCompletionTimeMinutes ?? 0,
      averageWatchTimeMinutes: data.metrics?.averageWatchTimeMinutes ?? 0,
      lastAccessAt: data.metrics?.lastAccessAt,
    };

    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
    this.currentVersionId = data.currentVersionId ?? "";
  }

  private safeString(v: any): string {
    return v ?? "";
  }

  // ======================
  // Publish / Unpublish
  // ======================
  publish(userId?: string) {
    this.validateBeforePublish();
    this.published = true;
    this.publishedAt = Timestamp.now();
    this.unpublishedAt = undefined;
    this.status = "disponivel";
    if (userId) this.updatedBy = userId;
    this.touch();
  }

  unpublish(userId?: string) {
    this.published = false;
    this.unpublishedAt = Timestamp.now();
    if (this.status === "disponivel") this.status = "indisponivel";
    if (userId) this.updatedBy = userId;
    this.touch();
  }

  archive(userId?: string) {
    this.archived = true;
    this.published = false;
    this.unpublishedAt = Timestamp.now();
    if (userId) this.updatedBy = userId;
    this.touch();
  }

  unarchive(userId?: string) {
    this.archived = false;
    if (userId) this.updatedBy = userId;
    this.touch();
  }

  setFeatured(featured: boolean, userId?: string) {
    this.featured = featured;
    if (userId) this.updatedBy = userId;
    this.touch();
  }

  // ======================
  // Update + ChangeLog
  // ======================
  update(
    data: Partial<Omit<ILesson, "id" | "createdAt" | "metrics" | "changeLog">>,
    userId?: string,
  ) {
    const snapshot: Partial<ILesson> = {
      moduleId: this.moduleId,
      title: this.title,
      slug: this.slug,
      content: this.content,
      sequence: this.sequence,
      status: this.status,
      updatedAt: this.updatedAt,
    };

    // inicializa array se não existir
    if (!Array.isArray(this.changeLog)) {
      this.changeLog = [];
    }

    // adiciona snapshot ao changeLog
    this.changeLog.push({
      version: this.version ?? 1,
      data: snapshot,
      updatedAt: Timestamp.now(),
    });

    // aplica atualização
    const oldTitle = this.title;
    Object.assign(this, data);

    this.title = this.title?.trim() || oldTitle;
    this.slug = data.slug?.trim() || this.generateSlug(this.title);
    this.shortDescription = this.shortDescription?.trim() ?? "";
    this.summary = this.summary?.trim() ?? "";
    this.category = this.category?.trim() ?? "";

    this.attachments = this.attachments ?? [];

    this.hasVideo = Boolean(this.videoUrl);
    this.hasText = (this.content?.length ?? 0) > 0;
    this.hasAttachments = this.attachments.length > 0;

    if (userId) {
      this.updatedBy = userId;
      this.createdBy = this.createdBy || "";
      this.responsibleInstructorId = this.responsibleInstructorId || "";
    }

    this.version = (this.version ?? 1) + 1;
    this.validate();
    this.touch();
  }

  // ======================
  // Prerequisites / Tags / Attachments
  // ======================
  addPrerequisite(lessonId: string) {
    const normalized = lessonId.trim();
    if (!normalized) return;
    if (this.id && normalized === this.id)
      throw new Error("A aula não pode ser pré-requisito dela mesma.");
    if (!this.prerequisiteLessonIds.includes(normalized)) {
      this.prerequisiteLessonIds.push(normalized);
      this.touch();
    }
  }

  removePrerequisite(lessonId: string) {
    this.prerequisiteLessonIds = this.prerequisiteLessonIds.filter(
      (id) => id !== lessonId,
    );
    this.touch();
  }

  addTag(tag: string) {
    const normalized = tag.trim();
    if (!normalized) return;
    if (!this.tags?.includes(normalized)) {
      this.tags = [...(this.tags ?? []), normalized];
      this.touch();
    }
  }

  removeTag(tag: string) {
    this.tags = (this.tags ?? []).filter((item) => item !== tag);
    this.touch();
  }

  addAttachment(attachment: ILessonAttachment) {
    if (!attachment?.name?.trim() || !attachment?.url?.trim())
      throw new Error("Anexo inválido.");
    this.attachments = this.attachments ?? [];
    this.attachments.push({
      name: attachment.name.trim(),
      url: attachment.url.trim(),
      type: attachment.type?.trim(),
    });
    this.hasAttachments = true;
    this.touch();
  }

  removeAttachment(url: string) {
    this.attachments = (this.attachments ?? []).filter((a) => a.url !== url);
    this.hasAttachments = this.attachments.length > 0;
    this.touch();
  }

  // ======================
  // Access / Metrics
  // ======================
  canUserAccess(completedLessonIds: string[]): boolean {
    if (!this.published || this.archived || this.visibility === "privada")
      return false;
    if (!this.prerequisiteLessonIds.length) return true;
    return this.prerequisiteLessonIds.every((id) =>
      completedLessonIds.includes(id),
    );
  }

  incrementViews() {
    this.ensureMetrics();
    this.metrics!.views += 1;
    this.metrics!.lastAccessAt = Timestamp.now();
    this.touch();
  }

  incrementStarts() {
    this.ensureMetrics();
    this.metrics!.starts += 1;
    this.touch();
  }

  incrementCompletions() {
    this.ensureMetrics();
    this.metrics!.completions += 1;
    this.touch();
  }

  incrementDropouts() {
    this.ensureMetrics();
    this.metrics!.dropouts += 1;
    this.touch();
  }

  setAverageProgress(value: number) {
    this.ensureMetrics();
    this.metrics!.averageProgress = this.clamp(value, 0, 100);
    this.touch();
  }

  setAverageScore(value: number) {
    this.ensureMetrics();
    this.metrics!.averageScore = this.clamp(value, 0, 100);
    this.touch();
  }

  setAverageCompletionTimeMinutes(value: number) {
    this.ensureMetrics();
    this.metrics!.averageCompletionTimeMinutes = Math.max(0, value);
    this.touch();
  }

  setAverageWatchTimeMinutes(value: number) {
    this.ensureMetrics();
    this.metrics!.averageWatchTimeMinutes = Math.max(0, value);
    this.touch();
  }

  getCompletionRate(): number {
    const starts = this.metrics?.starts ?? 0;
    const completions = this.metrics?.completions ?? 0;
    if (starts <= 0) return 0;
    return Number(((completions / starts) * 100).toFixed(2));
  }

  getDropoutRate(): number {
    const starts = this.metrics?.starts ?? 0;
    const dropouts = this.metrics?.dropouts ?? 0;
    if (starts <= 0) return 0;
    return Number(((dropouts / starts) * 100).toFixed(2));
  }

  // ======================
  // Validation
  // ======================
  validate() {
    if (!this.moduleId.trim())
      throw new Error("O moduleId da aula é obrigatório.");
    if (!this.title.trim()) throw new Error("O título da aula é obrigatório.");
    if (this.sequence < 1)
      throw new Error("A sequência da aula deve ser maior ou igual a 1.");
    if ((this.durationInMinutes ?? 0) < 0)
      throw new Error("A duração da aula não pode ser negativa.");
    if ((this.estimatedMinutes ?? 0) < 0)
      throw new Error("O tempo estimado não pode ser negativo.");
    if ((this.readingTimeMinutes ?? 0) < 0)
      throw new Error("O tempo de leitura não pode ser negativo.");
    if (this.id && this.prerequisiteLessonIds.includes(this.id))
      throw new Error("A aula não pode ser pré-requisito dela mesma.");

    if (this.metrics) {
      this.metrics.views = Math.max(0, this.metrics.views);
      this.metrics.starts = Math.max(0, this.metrics.starts);
      this.metrics.completions = Math.max(0, this.metrics.completions);
      this.metrics.dropouts = Math.max(0, this.metrics.dropouts);
      this.metrics.averageProgress = this.clamp(
        this.metrics.averageProgress,
        0,
        100,
      );
      this.metrics.averageScore = this.clamp(this.metrics.averageScore, 0, 100);
      this.metrics.averageCompletionTimeMinutes = Math.max(
        0,
        this.metrics.averageCompletionTimeMinutes,
      );
      this.metrics.averageWatchTimeMinutes = Math.max(
        0,
        this.metrics.averageWatchTimeMinutes,
      );
    }
  }

  validateBeforePublish() {
    this.validate();
    if (this.archived)
      throw new Error("Não é possível publicar uma aula arquivada.");

    const hasText = (this.content?.length ?? 0) > 0;
    const hasSomeContent =
      hasText ||
      Boolean(this.videoUrl?.trim()) ||
      (this.attachments?.length ?? 0) > 0;

    if (!hasSomeContent)
      throw new Error(
        "A aula precisa ter conteúdo em texto, vídeo ou anexo para ser publicada.",
      );
  }

  // ======================
  // Helpers
  // ======================
  private touch() {
    this.updatedAt = Timestamp.now();
  }

  private ensureMetrics() {
    if (!this.metrics) {
      this.metrics = {
        views: 0,
        starts: 0,
        completions: 0,
        dropouts: 0,
        averageProgress: 0,
        averageScore: 0,
        averageCompletionTimeMinutes: 0,
        averageWatchTimeMinutes: 0,
      };
    }
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  private generateSlug(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  toObject() {
    const cleanDate = (value: any) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
      return value;
    };

    return {
      id: this.id || "",
      moduleId: this.moduleId,
      title: this.title,
      slug: this.slug,
      shortDescription: this.shortDescription,
      summary: this.summary,
      content: this.content ?? [],
      sequence: this.sequence,
      status: this.status,
      level: this.level,
      type: this.type ?? "Texto",
      category: this.category,
      tags: this.tags ?? [],
      prerequisiteLessonIds: this.prerequisiteLessonIds ?? [],
      completionRewardIds: this.completionRewardIds ?? [],
      videoUrl: this.videoUrl ?? "",
      thumbnailUrl: this.thumbnailUrl ?? "",
      attachments: this.attachments ?? [],
      durationInMinutes: this.durationInMinutes ?? 0,
      estimatedMinutes: this.estimatedMinutes ?? 0,
      readingTimeMinutes: this.readingTimeMinutes ?? 0,
      hasVideo: this.hasVideo ?? false,
      hasText: this.hasText ?? false,
      hasAttachments: this.hasAttachments ?? false,
      published: this.published ?? false,
      publishedAt: cleanDate(this.publishedAt),
      unpublishedAt: cleanDate(this.unpublishedAt),
      archived: this.archived ?? false,
      featured: this.featured ?? false,
      visibility: this.visibility ?? "Pública",
      createdBy: this.createdBy || "",
      updatedBy: this.updatedBy || "",
      responsibleInstructorId: this.responsibleInstructorId || "",
      version: this.version ?? 1,
      changeLog: this.changeLog ?? [],
      metrics: this.metrics
        ? {
            views: this.metrics.views ?? 0,
            starts: this.metrics.starts ?? 0,
            completions: this.metrics.completions ?? 0,
            dropouts: this.metrics.dropouts ?? 0,
            averageProgress: this.metrics.averageProgress ?? 0,
            averageScore: this.metrics.averageScore ?? 0,
            averageCompletionTimeMinutes:
              this.metrics.averageCompletionTimeMinutes ?? 0,
            averageWatchTimeMinutes: this.metrics.averageWatchTimeMinutes ?? 0,
            lastAccessAt: cleanDate(this.metrics.lastAccessAt),
          }
        : {
            views: 0,
            starts: 0,
            completions: 0,
            dropouts: 0,
            averageProgress: 0,
            averageScore: 0,
            averageCompletionTimeMinutes: 0,
            averageWatchTimeMinutes: 0,
            lastAccessAt: null,
          },
      createdAt: cleanDate(this.createdAt),
      updatedAt: cleanDate(this.updatedAt),
    };
  }

  static fromFirestore(id: string, data: DocumentData): Lesson {
    return new Lesson({
      id,
      moduleId: data.moduleId,
      title: data.title,
      slug: data.slug,
      shortDescription: data.shortDescription,
      summary: data.summary,
      content: data.content ?? [],
      sequence: data.sequence ?? 1,
      status: data.status ?? "Em construção",
      level: data.level,
      type: data.type ?? "Texto",
      category: data.category,
      tags: data.tags ?? [],
      prerequisiteLessonIds: data.prerequisiteLessonIds ?? [],
      completionRewardIds: data.completionRewardIds ?? [],
      videoUrl: data.videoUrl || "",
      thumbnailUrl: data.thumbnailUrl,
      attachments: data.attachments ?? [],
      durationInMinutes: data.durationInMinutes ?? 0,
      estimatedMinutes: data.estimatedMinutes ?? 0,
      readingTimeMinutes: data.readingTimeMinutes ?? 0,
      hasVideo: data.hasVideo ?? false,
      hasText: data.hasText ?? false,
      hasAttachments: data.hasAttachments ?? false,
      published: data.published ?? false,
      publishedAt: data.publishedAt,
      unpublishedAt: data.unpublishedAt,
      archived: data.archived ?? false,
      featured: data.featured ?? false,
      visibility: data.visibility ?? "Pública",
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      responsibleInstructorId: data.responsibleInstructorId,
      version: data.version ?? 1,
      changeLog: data.changeLog ?? [],
      metrics: data.metrics,
      createdAt: data.createdAt ?? Timestamp.now(),
      updatedAt: data.updatedAt,
      currentVersionId: data.currentVersionId,
    });
  }
}

export interface ILesson2 {
  id: string;
  moduleId: string;
  sequence: number;
  currentVersionId?: string;
  publishedVersionId?: string;
  hasDraft?: boolean;
  versionsCount?: number;
  completionRewardIds?: string[];
  status:
    | "disponivel"
    | "indisponivel"
    | "em_construcao"
    | "em_revisao"
    | "em_edicao";
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface ILessonVersion2 {
  id: string;
  lessonId: string;
  version: number;
  status: "rascunho" | "publicada";
  title: string;
  slug?: string;
  summary?: string;
  content: IBlock[];
  type?: LessonType;
  tags?: string[];
  delivery?: "content" | "practice";
  practice?: {
    type: "simulation" | "game";
    targetId: string;
    targetSlug?: string;
    instructions?: string;
    minimumScore?: number;
    completionMode: "completed" | "minimum_score";
  };
  assessmentId?: string;
  prerequisiteLessonIds: string[];
  durationInMinutes?: number;
  visibility?: "publica" | "privada" | "restrita";
  publishedAt?: Timestamp;
  publishedBy?: string;
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
