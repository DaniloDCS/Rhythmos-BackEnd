// import { Timestamp } from "firebase-admin/firestore";
// import { TLevel, TStatus, TVisibility } from ".";

// export interface IModuleMetrics {
//   views: number;
//   starts: number;
//   completions: number;
//   dropouts: number;
//   averageProgress: number; // 0 a 100
//   averageScore: number; // 0 a 100
//   averageCompletionTimeMinutes: number;
//   lastAccessAt?: Timestamp;
// }

// export interface IModule {
//   id?: string;

//   // Relação
//   trailId: string;

//   // Identidade
//   title: string;
//   slug?: string;
//   shortDescription?: string;
//   description: string;

//   // Organização
//   sequence: number;
//   status?: TStatus;
//   level?: TLevel;
//   category?: string;
//   tags?: string[];

//   // Regras de acesso
//   published?: boolean;
//   prerequisiteModuleIds?: string[];

//   // Estrutura pedagógica
//   lessonIds?: string[];
//   quizIds?: string[];
//   activityIds?: string[];

//   totalLessons?: number;
//   totalQuizzes?: number;
//   totalActivities?: number;

//   estimatedMinutes?: number;
//   workloadHours?: number;

//   // Mídia
//   thumbnailUrl?: string;

//   // Publicação
//   publishedAt?: Timestamp;
//   unpublishedAt?: Timestamp;
//   archived?: boolean;
//   featured?: boolean;
//   visibility?: TVisibility;

//   // Auditoria
//   createdBy?: string;
//   updatedBy?: string;
//   responsibleInstructorId?: string;
//   version?: number;
//   changeLog?: string;

//   // Métricas
//   metrics?: IModuleMetrics;

//   // Datas
//   createdAt: Timestamp;
//   updatedAt?: Timestamp;
// }

// export class Module implements IModule {
//   id?: string;

//   trailId: string;

//   title: string;
//   slug?: string;
//   shortDescription?: string;
//   description: string;

//   sequence: number;
//   status: TStatus;
//   level?: TLevel;
//   category?: string;
//   tags?: string[];

//   published: boolean;
//   prerequisiteModuleIds: string[];

//   lessonIds?: string[];
//   quizIds?: string[];
//   activityIds?: string[];

//   totalLessons?: number;
//   totalQuizzes?: number;
//   totalActivities?: number;

//   estimatedMinutes?: number;
//   workloadHours?: number;

//   thumbnailUrl?: string;

//   publishedAt?: Timestamp;
//   unpublishedAt?: Timestamp;
//   archived?: boolean;
//   featured?: boolean;
//   visibility?: TVisibility;

//   createdBy?: string;
//   updatedBy?: string;
//   responsibleInstructorId?: string;
//   version?: number;
//   changeLog?: string;

//   metrics?: IModuleMetrics;

//   createdAt: Timestamp;
//   updatedAt?: Timestamp;

//   constructor(data: Partial<IModule>) {
//     this.id = data.id;

//     this.trailId = data.trailId?.trim() ?? "";

//     this.title = data.title?.trim() ?? "Novo Módulo";
//     this.slug = data.slug?.trim() ?? this.generateSlug(this.title);
//     this.shortDescription = data.shortDescription?.trim() ?? "";
//     this.description = data.description?.trim() ?? "";

//     this.sequence = data.sequence ?? 1;
//     this.status = data.status ?? "em_construcao";
//     this.level = data.level ?? "basico";
//     this.category = data.category?.trim() ?? "";
//     this.tags = data.tags ?? [];

//     this.published = data.published ?? false;
//     this.prerequisiteModuleIds = data.prerequisiteModuleIds ?? [];

//     this.lessonIds = data.lessonIds ?? [];
//     this.quizIds = data.quizIds ?? [];
//     this.activityIds = data.activityIds ?? [];

//     this.totalLessons = data.totalLessons ?? this.lessonIds.length ?? 0;
//     this.totalQuizzes = data.totalQuizzes ?? this.quizIds.length ?? 0;
//     this.totalActivities = data.totalActivities ?? this.activityIds.length ?? 0;

//     this.estimatedMinutes = data.estimatedMinutes ?? 0;
//     this.workloadHours = data.workloadHours ?? 0;

//     this.thumbnailUrl = data.thumbnailUrl;

//     this.publishedAt = data.publishedAt;
//     this.unpublishedAt = data.unpublishedAt;
//     this.archived = data.archived ?? false;
//     this.featured = data.featured ?? false;
//     this.visibility = data.visibility ?? "publica";

//     this.createdBy = data.createdBy;
//     this.updatedBy = data.updatedBy;
//     this.responsibleInstructorId = data.responsibleInstructorId;
//     this.version = data.version ?? 1;
//     this.changeLog = data.changeLog?.trim() ?? "";

//     this.metrics = {
//       views: data.metrics?.views ?? 0,
//       starts: data.metrics?.starts ?? 0,
//       completions: data.metrics?.completions ?? 0,
//       dropouts: data.metrics?.dropouts ?? 0,
//       averageProgress: data.metrics?.averageProgress ?? 0,
//       averageScore: data.metrics?.averageScore ?? 0,
//       averageCompletionTimeMinutes:
//         data.metrics?.averageCompletionTimeMinutes ?? 0,
//       lastAccessAt: data.metrics?.lastAccessAt,
//     };

//     this.createdAt = data.createdAt ?? Timestamp.now();
//     this.updatedAt = data.updatedAt;
//   }

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

//     if (this.status === "disponivel") {
//       this.status = "indisponivel";
//     }

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

//   update(
//     data: Partial<Omit<IModule, "id" | "createdAt" | "metrics">>,
//     userId?: string,
//   ) {
//     const oldTitle = this.title;

//     Object.assign(this, data);

//     this.title = this.title?.trim() || oldTitle;
//     this.slug = data.slug?.trim() || this.generateSlug(this.title);
//     this.shortDescription = this.shortDescription?.trim() ?? "";
//     this.description = this.description?.trim() ?? "";
//     this.category = this.category?.trim() ?? "";
//     this.changeLog = this.changeLog?.trim() ?? "";

//     this.lessonIds = this.lessonIds ?? [];
//     this.quizIds = this.quizIds ?? [];
//     this.activityIds = this.activityIds ?? [];

//     this.totalLessons = this.totalLessons ?? this.lessonIds.length;
//     this.totalQuizzes = this.totalQuizzes ?? this.quizIds.length;
//     this.totalActivities = this.totalActivities ?? this.activityIds.length;

//     if (userId) this.updatedBy = userId;

//     this.version = (this.version ?? 1) + 1;
//     this.validate();
//     this.touch();
//   }

//   addPrerequisite(moduleId: string) {
//     const normalized = moduleId.trim();
//     if (!normalized) return;

//     if (this.id && normalized === this.id) {
//       throw new Error("O módulo não pode ser pré-requisito dele mesmo.");
//     }

//     if (!this.prerequisiteModuleIds.includes(normalized)) {
//       this.prerequisiteModuleIds.push(normalized);
//       this.touch();
//     }
//   }

//   removePrerequisite(moduleId: string) {
//     this.prerequisiteModuleIds = this.prerequisiteModuleIds.filter(
//       (id) => id !== moduleId,
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

//   addLesson(lessonId: string) {
//     const normalized = lessonId.trim();
//     if (!normalized) return;

//     this.lessonIds = this.lessonIds ?? [];
//     if (!this.lessonIds.includes(normalized)) {
//       this.lessonIds.push(normalized);
//       this.totalLessons = this.lessonIds.length;
//       this.touch();
//     }
//   }

//   removeLesson(lessonId: string) {
//     this.lessonIds = (this.lessonIds ?? []).filter((id) => id !== lessonId);
//     this.totalLessons = this.lessonIds.length;
//     this.touch();
//   }

//   addQuiz(quizId: string) {
//     const normalized = quizId.trim();
//     if (!normalized) return;

//     this.quizIds = this.quizIds ?? [];
//     if (!this.quizIds.includes(normalized)) {
//       this.quizIds.push(normalized);
//       this.totalQuizzes = this.quizIds.length;
//       this.touch();
//     }
//   }

//   removeQuiz(quizId: string) {
//     this.quizIds = (this.quizIds ?? []).filter((id) => id !== quizId);
//     this.totalQuizzes = this.quizIds.length;
//     this.touch();
//   }

//   addActivity(activityId: string) {
//     const normalized = activityId.trim();
//     if (!normalized) return;

//     this.activityIds = this.activityIds ?? [];
//     if (!this.activityIds.includes(normalized)) {
//       this.activityIds.push(normalized);
//       this.totalActivities = this.activityIds.length;
//       this.touch();
//     }
//   }

//   removeActivity(activityId: string) {
//     this.activityIds = (this.activityIds ?? []).filter(
//       (id) => id !== activityId,
//     );
//     this.totalActivities = this.activityIds.length;
//     this.touch();
//   }

//   canUserAccess(completedModuleIds: string[], allModules: Module[] = []) {
//     if (!this.published) return false;
//     if (this.archived) return false;
//     if (this.visibility === "privada") return false;

//     const previousModules = allModules
//       .filter(
//         (m) =>
//           m.trailId === this.trailId &&
//           m.sequence < this.sequence &&
//           Boolean(m.id),
//       )
//       .map((m) => m.id as string);

//     const completedPrevious = previousModules.every((id) =>
//       completedModuleIds.includes(id),
//     );

//     if (!completedPrevious) return false;

//     const completedCustom = this.prerequisiteModuleIds.every((id) =>
//       completedModuleIds.includes(id),
//     );

//     return completedCustom;
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

//   validate() {
//     if (!this.trailId.trim()) {
//       throw new Error("O trailId do módulo é obrigatório.");
//     }

//     if (!this.title.trim()) {
//       throw new Error("O título do módulo é obrigatório.");
//     }

//     if (!this.description.trim()) {
//       throw new Error("A descrição do módulo é obrigatória.");
//     }

//     if (this.sequence < 1) {
//       throw new Error("A sequência do módulo deve ser maior ou igual a 1.");
//     }

//     if ((this.estimatedMinutes ?? 0) < 0) {
//       throw new Error("O tempo estimado não pode ser negativo.");
//     }

//     if ((this.workloadHours ?? 0) < 0) {
//       throw new Error("A carga horária não pode ser negativa.");
//     }

//     if ((this.totalLessons ?? 0) < 0) {
//       throw new Error("O total de aulas não pode ser negativo.");
//     }

//     if ((this.totalQuizzes ?? 0) < 0) {
//       throw new Error("O total de quizzes não pode ser negativo.");
//     }

//     if ((this.totalActivities ?? 0) < 0) {
//       throw new Error("O total de atividades não pode ser negativo.");
//     }

//     if (this.id && this.prerequisiteModuleIds.includes(this.id)) {
//       throw new Error("O módulo não pode ser pré-requisito dele mesmo.");
//     }

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
//     }
//   }

//   validateBeforePublish() {
//     this.validate();

//     if (this.archived) {
//       throw new Error("Não é possível publicar um módulo arquivado.");
//     }

//     if ((this.totalLessons ?? 0) <= 0 && (this.totalActivities ?? 0) <= 0) {
//       throw new Error(
//         "O módulo precisa ter pelo menos aulas ou atividades para ser publicado.",
//       );
//     }
//   }

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
//     return {
//       id: this.id ?? null,

//       trailId: this.trailId,

//       title: this.title,
//       slug: this.slug ?? null,
//       shortDescription: this.shortDescription ?? null,
//       description: this.description,

//       sequence: this.sequence,
//       status: this.status,
//       level: this.level ?? null,
//       category: this.category ?? null,
//       tags: this.tags ?? [],

//       published: this.published,
//       prerequisiteModuleIds: this.prerequisiteModuleIds ?? [],

//       lessonIds: this.lessonIds ?? [],
//       quizIds: this.quizIds ?? [],
//       activityIds: this.activityIds ?? [],

//       totalLessons: this.totalLessons ?? 0,
//       totalQuizzes: this.totalQuizzes ?? 0,
//       totalActivities: this.totalActivities ?? 0,

//       estimatedMinutes: this.estimatedMinutes ?? 0,
//       workloadHours: this.workloadHours ?? 0,

//       thumbnailUrl: this.thumbnailUrl ?? null,

//       publishedAt: this.publishedAt ?? null,
//       unpublishedAt: this.unpublishedAt ?? null,
//       archived: this.archived ?? false,
//       featured: this.featured ?? false,
//       visibility: this.visibility ?? "Pública",

//       createdBy: this.createdBy ?? null,
//       updatedBy: this.updatedBy ?? null,
//       responsibleInstructorId: this.responsibleInstructorId ?? null,
//       version: this.version ?? 1,
//       changeLog: this.changeLog ?? null,

//       metrics: this.metrics
//         ? {
//             views: this.metrics.views,
//             starts: this.metrics.starts,
//             completions: this.metrics.completions,
//             dropouts: this.metrics.dropouts,
//             averageProgress: this.metrics.averageProgress,
//             averageScore: this.metrics.averageScore,
//             averageCompletionTimeMinutes:
//               this.metrics.averageCompletionTimeMinutes,
//             lastAccessAt: this.metrics.lastAccessAt ?? null,
//           }
//         : null,

//       createdAt: this.createdAt,
//       updatedAt: this.updatedAt ?? null,
//     };
//   }

//   static fromFirestore(id: string, data: FirebaseFirestore.DocumentData) {
//     if (!data) throw new Error("Dados do módulo inválidos");

//     return new Module({
//       id,

//       trailId: data.trailId,
//       title: data.title,
//       slug: data.slug,
//       shortDescription: data.shortDescription,
//       description: data.description,

//       sequence: data.sequence ?? 1,
//       status: data.status,
//       level: data.level,
//       category: data.category,
//       tags: data.tags ?? [],

//       published: data.published ?? false,
//       prerequisiteModuleIds: data.prerequisiteModuleIds ?? [],

//       lessonIds: data.lessonIds ?? [],
//       quizIds: data.quizIds ?? [],
//       activityIds: data.activityIds ?? [],

//       totalLessons: data.totalLessons ?? 0,
//       totalQuizzes: data.totalQuizzes ?? 0,
//       totalActivities: data.totalActivities ?? 0,

//       estimatedMinutes: data.estimatedMinutes ?? 0,
//       workloadHours: data.workloadHours ?? 0,

//       thumbnailUrl: data.thumbnailUrl,

//       publishedAt: data.publishedAt,
//       unpublishedAt: data.unpublishedAt,
//       archived: data.archived ?? false,
//       featured: data.featured ?? false,
//       visibility: data.visibility ?? "Pública",

//       createdBy: data.createdBy,
//       updatedBy: data.updatedBy,
//       responsibleInstructorId: data.responsibleInstructorId,
//       version: data.version ?? 1,
//       changeLog: data.changeLog,

//       metrics: data.metrics
//         ? {
//             views: data.metrics.views ?? 0,
//             starts: data.metrics.starts ?? 0,
//             completions: data.metrics.completions ?? 0,
//             dropouts: data.metrics.dropouts ?? 0,
//             averageProgress: data.metrics.averageProgress ?? 0,
//             averageScore: data.metrics.averageScore ?? 0,
//             averageCompletionTimeMinutes:
//               data.metrics.averageCompletionTimeMinutes ?? 0,
//             lastAccessAt: data.metrics.lastAccessAt,
//           }
//         : undefined,

//       createdAt: data.createdAt,
//       updatedAt: data.updatedAt,
//     });
//   }
// }

import { Timestamp } from "firebase-admin/firestore";
import { TLevel, TStatus, TVisibility } from ".";

export interface IModuleMetrics {
  views: number;
  starts: number;
  completions: number;
  dropouts: number;
  averageProgress: number; // 0 a 100
  averageScore: number; // 0 a 100
  averageCompletionTimeMinutes: number;
  lastAccessAt?: Timestamp;
}

export interface IModule {
  id?: string;

  // Relação
  trailId: string;

  // Identidade
  title: string;
  slug?: string;
  shortDescription?: string;
  description: string;

  // Organização
  sequence: number;
  status?: TStatus;
  level?: TLevel;
  category?: string;
  tags?: string[];

  // Regras de acesso
  published?: boolean;
  prerequisiteModuleIds?: string[];

  // Estrutura pedagógica
  lessonIds?: string[];
  quizIds?: string[];
  activityIds?: string[];

  /** Avaliação somativa obrigatória ao final do módulo. */
  finalAssessmentId?: string;

  totalLessons?: number;
  totalQuizzes?: number;
  totalActivities?: number;

  estimatedMinutes?: number;
  workloadHours?: number;

  // Mídia
  thumbnailUrl?: string;

  // Publicação
  publishedAt?: Timestamp;
  unpublishedAt?: Timestamp;
  archived?: boolean;
  featured?: boolean;
  visibility?: TVisibility;

  // Auditoria
  createdBy?: string;
  updatedBy?: string;
  responsibleInstructorId?: string;
  version?: number;
  changeLog?: string;

  // Métricas
  metrics?: IModuleMetrics;

  // Datas
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export class Module implements IModule {
  id?: string;

  trailId: string;

  title: string;
  slug?: string;
  shortDescription?: string;
  description: string;

  sequence: number;
  status: TStatus;
  level?: TLevel;
  category?: string;
  tags?: string[];

  published: boolean;
  prerequisiteModuleIds: string[];

  lessonIds?: string[];
  quizIds?: string[];
  activityIds?: string[];
  finalAssessmentId?: string;

  totalLessons?: number;
  totalQuizzes?: number;
  totalActivities?: number;

  estimatedMinutes?: number;
  workloadHours?: number;

  thumbnailUrl?: string;

  publishedAt?: Timestamp;
  unpublishedAt?: Timestamp;
  archived?: boolean;
  featured?: boolean;
  visibility?: TVisibility;

  createdBy?: string;
  updatedBy?: string;
  responsibleInstructorId?: string;
  version?: number;
  changeLog?: string;

  metrics?: IModuleMetrics;

  createdAt: Timestamp;
  updatedAt?: Timestamp;

  constructor(data: Partial<IModule>) {
    this.id = data.id;

    this.trailId = data.trailId?.trim() ?? "";

    this.title = data.title?.trim() ?? "Novo Módulo";
    this.slug = data.slug?.trim() ?? this.generateSlug(this.title);
    this.shortDescription = data.shortDescription?.trim() ?? "";
    this.description = data.description?.trim() ?? "";

    this.sequence = data.sequence ?? 1;
    this.status = data.status ?? "em_construcao";
    this.level = data.level ?? "basico";
    this.category = data.category?.trim() ?? "";
    this.tags = data.tags ?? [];

    this.published = data.published ?? false;
    this.prerequisiteModuleIds = data.prerequisiteModuleIds ?? [];

    this.lessonIds = data.lessonIds ?? [];
    this.quizIds = data.quizIds ?? [];
    this.activityIds = data.activityIds ?? [];
    this.finalAssessmentId = data.finalAssessmentId?.trim() || undefined;

    this.totalLessons = data.totalLessons ?? this.lessonIds.length ?? 0;
    this.totalQuizzes = data.totalQuizzes ?? this.quizIds.length ?? 0;
    this.totalActivities = data.totalActivities ?? this.activityIds.length ?? 0;

    this.estimatedMinutes = data.estimatedMinutes ?? 0;
    this.workloadHours = data.workloadHours ?? 0;

    this.thumbnailUrl = data.thumbnailUrl;

    this.publishedAt = data.publishedAt;
    this.unpublishedAt = data.unpublishedAt;
    this.archived = data.archived ?? false;
    this.featured = data.featured ?? false;
    this.visibility = data.visibility ?? "publica";

    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.responsibleInstructorId = data.responsibleInstructorId;
    this.version = data.version ?? 1;
    this.changeLog = data.changeLog?.trim() ?? "";

    this.metrics = {
      views: data.metrics?.views ?? 0,
      starts: data.metrics?.starts ?? 0,
      completions: data.metrics?.completions ?? 0,
      dropouts: data.metrics?.dropouts ?? 0,
      averageProgress: data.metrics?.averageProgress ?? 0,
      averageScore: data.metrics?.averageScore ?? 0,
      averageCompletionTimeMinutes:
        data.metrics?.averageCompletionTimeMinutes ?? 0,
      lastAccessAt: data.metrics?.lastAccessAt,
    };

    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
  }

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

    if (this.status === "disponivel") {
      this.status = "indisponivel";
    }

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

  update(
    data: Partial<Omit<IModule, "id" | "createdAt" | "metrics">>,
    userId?: string,
  ) {
    const oldTitle = this.title;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (this as unknown as Record<string, unknown>)[key] = value;
      }
    }

    this.title = this.title?.trim() || oldTitle;
    this.slug = data.slug?.trim() || this.generateSlug(this.title);
    this.shortDescription = this.shortDescription?.trim() ?? "";
    this.description = this.description?.trim() ?? "";
    this.category = this.category?.trim() ?? "";
    this.changeLog = this.changeLog?.trim() ?? "";

    this.lessonIds = this.lessonIds ?? [];
    this.quizIds = this.quizIds ?? [];
    this.activityIds = this.activityIds ?? [];
    this.finalAssessmentId = this.finalAssessmentId?.trim() || undefined;

    this.totalLessons = this.totalLessons ?? this.lessonIds.length;
    this.totalQuizzes = this.totalQuizzes ?? this.quizIds.length;
    this.totalActivities = this.totalActivities ?? this.activityIds.length;

    if (userId) this.updatedBy = userId;

    this.version = (this.version ?? 1) + 1;
    this.validate();
    this.touch();
  }

  addPrerequisite(moduleId: string) {
    const normalized = moduleId.trim();
    if (!normalized) return;

    if (this.id && normalized === this.id) {
      throw new Error("O módulo não pode ser pré-requisito dele mesmo.");
    }

    if (!this.prerequisiteModuleIds.includes(normalized)) {
      this.prerequisiteModuleIds.push(normalized);
      this.touch();
    }
  }

  removePrerequisite(moduleId: string) {
    this.prerequisiteModuleIds = this.prerequisiteModuleIds.filter(
      (id) => id !== moduleId,
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

  addLesson(lessonId: string) {
    const normalized = lessonId.trim();
    if (!normalized) return;

    this.lessonIds = this.lessonIds ?? [];
    if (!this.lessonIds.includes(normalized)) {
      this.lessonIds.push(normalized);
      this.totalLessons = this.lessonIds.length;
      this.touch();
    }
  }

  removeLesson(lessonId: string) {
    this.lessonIds = (this.lessonIds ?? []).filter((id) => id !== lessonId);
    this.totalLessons = this.lessonIds.length;
    this.touch();
  }

  addQuiz(quizId: string) {
    const normalized = quizId.trim();
    if (!normalized) return;

    this.quizIds = this.quizIds ?? [];
    if (!this.quizIds.includes(normalized)) {
      this.quizIds.push(normalized);
      this.totalQuizzes = this.quizIds.length;
      this.touch();
    }
  }

  removeQuiz(quizId: string) {
    this.quizIds = (this.quizIds ?? []).filter((id) => id !== quizId);
    this.totalQuizzes = this.quizIds.length;
    this.touch();
  }

  addActivity(activityId: string) {
    const normalized = activityId.trim();
    if (!normalized) return;

    this.activityIds = this.activityIds ?? [];
    if (!this.activityIds.includes(normalized)) {
      this.activityIds.push(normalized);
      this.totalActivities = this.activityIds.length;
      this.touch();
    }
  }

  removeActivity(activityId: string) {
    this.activityIds = (this.activityIds ?? []).filter(
      (id) => id !== activityId,
    );
    this.totalActivities = this.activityIds.length;
    this.touch();
  }

  canUserAccess(completedModuleIds: string[], allModules: Module[] = []) {
    if (!this.published) return false;
    if (this.archived) return false;
    if (this.visibility === "privada") return false;

    const previousModules = allModules
      .filter(
        (m) =>
          m.trailId === this.trailId &&
          m.sequence < this.sequence &&
          Boolean(m.id),
      )
      .map((m) => m.id as string);

    const completedPrevious = previousModules.every((id) =>
      completedModuleIds.includes(id),
    );

    if (!completedPrevious) return false;

    const completedCustom = this.prerequisiteModuleIds.every((id) =>
      completedModuleIds.includes(id),
    );

    return completedCustom;
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

  validate() {
    if (!this.trailId.trim()) {
      throw new Error("O trailId do módulo é obrigatório.");
    }

    if (!this.title.trim()) {
      throw new Error("O título do módulo é obrigatório.");
    }

    if (!this.description.trim()) {
      throw new Error("A descrição do módulo é obrigatória.");
    }

    if (this.sequence < 1) {
      throw new Error("A sequência do módulo deve ser maior ou igual a 1.");
    }

    if ((this.estimatedMinutes ?? 0) < 0) {
      throw new Error("O tempo estimado não pode ser negativo.");
    }

    if ((this.workloadHours ?? 0) < 0) {
      throw new Error("A carga horária não pode ser negativa.");
    }

    if ((this.totalLessons ?? 0) < 0) {
      throw new Error("O total de aulas não pode ser negativo.");
    }

    if ((this.totalQuizzes ?? 0) < 0) {
      throw new Error("O total de quizzes não pode ser negativo.");
    }

    if ((this.totalActivities ?? 0) < 0) {
      throw new Error("O total de atividades não pode ser negativo.");
    }

    if (this.id && this.prerequisiteModuleIds.includes(this.id)) {
      throw new Error("O módulo não pode ser pré-requisito dele mesmo.");
    }

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
    }
  }

  validateBeforePublish() {
    this.validate();

    if (this.archived) {
      throw new Error("Não é possível publicar um módulo arquivado.");
    }

    if ((this.totalLessons ?? 0) <= 0 && (this.totalActivities ?? 0) <= 0) {
      throw new Error(
        "O módulo precisa ter pelo menos aulas ou atividades para ser publicado.",
      );
    }
  }

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
    return {
      id: this.id ?? null,

      trailId: this.trailId,

      title: this.title,
      slug: this.slug ?? null,
      shortDescription: this.shortDescription ?? null,
      description: this.description,

      sequence: this.sequence,
      status: this.status,
      level: this.level ?? null,
      category: this.category ?? null,
      tags: this.tags ?? [],

      published: this.published,
      prerequisiteModuleIds: this.prerequisiteModuleIds ?? [],

      lessonIds: this.lessonIds ?? [],
      quizIds: this.quizIds ?? [],
      activityIds: this.activityIds ?? [],
      finalAssessmentId: this.finalAssessmentId ?? null,

      totalLessons: this.totalLessons ?? 0,
      totalQuizzes: this.totalQuizzes ?? 0,
      totalActivities: this.totalActivities ?? 0,

      estimatedMinutes: this.estimatedMinutes ?? 0,
      workloadHours: this.workloadHours ?? 0,

      thumbnailUrl: this.thumbnailUrl ?? null,

      publishedAt: this.publishedAt ?? null,
      unpublishedAt: this.unpublishedAt ?? null,
      archived: this.archived ?? false,
      featured: this.featured ?? false,
      visibility: this.visibility ?? "Pública",

      createdBy: this.createdBy ?? null,
      updatedBy: this.updatedBy ?? null,
      responsibleInstructorId: this.responsibleInstructorId ?? null,
      version: this.version ?? 1,
      changeLog: this.changeLog ?? null,

      metrics: this.metrics
        ? {
            views: this.metrics.views,
            starts: this.metrics.starts,
            completions: this.metrics.completions,
            dropouts: this.metrics.dropouts,
            averageProgress: this.metrics.averageProgress,
            averageScore: this.metrics.averageScore,
            averageCompletionTimeMinutes:
              this.metrics.averageCompletionTimeMinutes,
            lastAccessAt: this.metrics.lastAccessAt ?? null,
          }
        : null,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt ?? null,
    };
  }

  static fromFirestore(id: string, data: FirebaseFirestore.DocumentData) {
    if (!data) throw new Error("Dados do módulo inválidos");

    return new Module({
      id,

      trailId: data.trailId,
      title: data.title,
      slug: data.slug,
      shortDescription: data.shortDescription,
      description: data.description,

      sequence: data.sequence ?? 1,
      status: data.status,
      level: data.level,
      category: data.category,
      tags: data.tags ?? [],

      published: data.published ?? false,
      prerequisiteModuleIds: data.prerequisiteModuleIds ?? [],

      lessonIds: data.lessonIds ?? [],
      quizIds: data.quizIds ?? [],
      activityIds: data.activityIds ?? [],
      finalAssessmentId: data.finalAssessmentId,

      totalLessons: data.totalLessons ?? 0,
      totalQuizzes: data.totalQuizzes ?? 0,
      totalActivities: data.totalActivities ?? 0,

      estimatedMinutes: data.estimatedMinutes ?? 0,
      workloadHours: data.workloadHours ?? 0,

      thumbnailUrl: data.thumbnailUrl,

      publishedAt: data.publishedAt,
      unpublishedAt: data.unpublishedAt,
      archived: data.archived ?? false,
      featured: data.featured ?? false,
      visibility: data.visibility ?? "Pública",

      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      responsibleInstructorId: data.responsibleInstructorId,
      version: data.version ?? 1,
      changeLog: data.changeLog,

      metrics: data.metrics
        ? {
            views: data.metrics.views ?? 0,
            starts: data.metrics.starts ?? 0,
            completions: data.metrics.completions ?? 0,
            dropouts: data.metrics.dropouts ?? 0,
            averageProgress: data.metrics.averageProgress ?? 0,
            averageScore: data.metrics.averageScore ?? 0,
            averageCompletionTimeMinutes:
              data.metrics.averageCompletionTimeMinutes ?? 0,
            lastAccessAt: data.metrics.lastAccessAt,
          }
        : undefined,

      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
