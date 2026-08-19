import { Timestamp } from "firebase-admin/firestore";

import { TLevel, TStatus } from "../../shared/domain.types";

import type { ITrailMetrics, ITrail } from "./trail.types";

export type { ITrailMetrics, ITrail } from "./trail.types";

export class Trail implements ITrail {
  id?: string;
  title: string;
  slug?: string;
  description: string;
  status: TStatus;
  enrollmentPolicy: "open" | "closed";
  enrolledAccessPolicy: "continue" | "paused";
  level?: TLevel;
  category?: string;
  tags?: string[];
  prerequisiteTrailIds: string[];
  order: number;
  thumbnailUrl?: string;
  workloadHours?: number;
  estimatedMinutes?: number;
  featured?: boolean;
  createdBy?: string;
  updatedBy?: string;
  responsibleInstructorId?: string;
  version?: number;
  totalModules: number;
  totalLessons: number;
  metrics?: ITrailMetrics;
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  constructor(data: Partial<ITrail>) {
    this.id = data.id;

    this.title = data.title?.trim() ?? "Nova Trilha";
    this.slug = data.slug?.trim() ?? this.generateSlug(this.title);
    this.description = data.description?.trim() ?? "";

    this.status = data.status ?? "rascunho";
    this.enrollmentPolicy = data.enrollmentPolicy ?? "open";
    this.enrolledAccessPolicy = data.enrolledAccessPolicy ?? "continue";
    this.level = data.level ?? "basico";
    this.category = data.category?.trim() ?? "";
    this.tags = data.tags ?? [];
    this.prerequisiteTrailIds = data.prerequisiteTrailIds ?? [];
    this.order = data.order ?? 0;

    this.thumbnailUrl = data.thumbnailUrl;

    this.workloadHours = data.workloadHours ?? 0;
    this.estimatedMinutes = data.estimatedMinutes ?? 0;

    this.featured = data.featured ?? false;

    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.responsibleInstructorId = data.responsibleInstructorId;
    this.version = data.version ?? 1;
    this.totalModules = data.totalModules ?? 0;
    this.totalLessons = data.totalLessons ?? 0;

    this.metrics = {
      views: data.metrics?.views ?? 0,
      enrollments: data.metrics?.enrollments ?? 0,
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

  publish() {
    this.status = "disponivel";
    this.touch();
  }

  setFeatured(featured: boolean) {
    this.featured = featured;
    this.touch();
  }

  update(data: Partial<Omit<ITrail, "id" | "createdAt" | "metrics">>) {
    const hasChanges = Object.entries(data).some(([key, value]) => {
      const current = (this as unknown as Record<string, unknown>)[key];
      return JSON.stringify(current) !== JSON.stringify(value);
    });

    if (!hasChanges) return;

    const oldTitle = this.title;

    Object.assign(this, data);

    this.title = this.title?.trim() || oldTitle;
    this.slug = data.slug?.trim() || this.generateSlug(this.title);
    this.description = this.description?.trim() ?? "";
    this.category = this.category?.trim() ?? "";

    this.version = (this.version ?? 1) + 1;
    this.validate();
    this.touch();
  }

  addPrerequisite(trailId: string) {
    if (!trailId.trim()) return;
    if (this.id && trailId === this.id) {
      throw new Error("A trilha não pode ser pré-requisito dela mesma.");
    }

    if (!this.prerequisiteTrailIds.includes(trailId)) {
      this.prerequisiteTrailIds.push(trailId);
      this.touch();
    }
  }

  removePrerequisite(trailId: string) {
    this.prerequisiteTrailIds = this.prerequisiteTrailIds.filter(
      (id) => id !== trailId,
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

  canUserAccess(completedTrailIds: string[]): boolean {
    if (!this.prerequisiteTrailIds.length) return true;

    return this.prerequisiteTrailIds.every((id) =>
      completedTrailIds.includes(id),
    );
  }

  incrementViews() {
    this.ensureMetrics();
    this.metrics!.views += 1;
    this.metrics!.lastAccessAt = Timestamp.now();
    this.touch();
  }

  incrementEnrollments() {
    this.ensureMetrics();
    this.metrics!.enrollments += 1;
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
    const enrollments = this.metrics?.enrollments ?? 0;
    const completions = this.metrics?.completions ?? 0;

    if (enrollments <= 0) return 0;
    return Number(((completions / enrollments) * 100).toFixed(2));
  }

  getDropoutRate(): number {
    const enrollments = this.metrics?.enrollments ?? 0;
    const dropouts = this.metrics?.dropouts ?? 0;

    if (enrollments <= 0) return 0;
    return Number(((dropouts / enrollments) * 100).toFixed(2));
  }

  getStartRate(): number {
    const enrollments = this.metrics?.enrollments ?? 0;
    const starts = this.metrics?.starts ?? 0;

    if (enrollments <= 0) return 0;
    return Number(((starts / enrollments) * 100).toFixed(2));
  }

  getEngagementRate(): number {
    const views = this.metrics?.views ?? 0;
    const enrollments = this.metrics?.enrollments ?? 0;

    if (views <= 0) return 0;
    return Number(((enrollments / views) * 100).toFixed(2));
  }

  validate() {
    if (!this.title.trim()) {
      throw new Error("O título da trilha é obrigatório.");
    }

    if (!this.description.trim()) {
      throw new Error("A descrição da trilha é obrigatória.");
    }

    if (this.order < 0) {
      throw new Error("A ordem da trilha não pode ser negativa.");
    }

    if (!["open", "closed"].includes(this.enrollmentPolicy)) {
      throw new Error("A política de novas matrículas é inválida.");
    }

    if (!["continue", "paused"].includes(this.enrolledAccessPolicy)) {
      throw new Error("A política de acesso dos matriculados é inválida.");
    }

    if (this.id && this.prerequisiteTrailIds.includes(this.id)) {
      throw new Error("A trilha não pode ser pré-requisito dela mesma.");
    }

    if (this.metrics) {
      this.metrics.averageProgress = this.clamp(
        this.metrics.averageProgress,
        0,
        100,
      );
      this.metrics.averageScore = this.clamp(this.metrics.averageScore, 0, 100);

      this.metrics.views = Math.max(0, this.metrics.views);
      this.metrics.enrollments = Math.max(0, this.metrics.enrollments);
      this.metrics.starts = Math.max(0, this.metrics.starts);
      this.metrics.completions = Math.max(0, this.metrics.completions);
      this.metrics.dropouts = Math.max(0, this.metrics.dropouts);
      this.metrics.averageCompletionTimeMinutes = Math.max(
        0,
        this.metrics.averageCompletionTimeMinutes,
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
        enrollments: 0,
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

      title: this.title,
      slug: this.slug ?? null,
      description: this.description,

      status: this.status,
      enrollmentPolicy: this.enrollmentPolicy,
      enrolledAccessPolicy: this.enrolledAccessPolicy,
      level: this.level ?? null,
      category: this.category ?? null,
      tags: this.tags ?? [],
      prerequisiteTrailIds: this.prerequisiteTrailIds,
      order: this.order,

      thumbnailUrl: this.thumbnailUrl ?? null,

      workloadHours: this.workloadHours ?? 0,
      estimatedMinutes: this.estimatedMinutes ?? 0,

      featured: this.featured ?? false,

      createdBy: this.createdBy ?? null,
      updatedBy: this.updatedBy ?? null,
      responsibleInstructorId: this.responsibleInstructorId ?? null,
      version: this.version ?? 1,

      metrics: this.metrics
        ? {
            views: this.metrics.views,
            enrollments: this.metrics.enrollments,
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

      totalLessons: this.totalLessons,
      totalModules: this.totalModules,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt ?? null,
    };
  }

  static fromFirestore(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): Trail {
    return new Trail({
      id,

      title: data.title,
      slug: data.slug,
      description: data.description,

      status: data.status,
      enrollmentPolicy: data.enrollmentPolicy ?? "open",
      enrolledAccessPolicy: data.enrolledAccessPolicy ?? "continue",
      level: data.level,
      category: data.category,
      tags: data.tags ?? [],
      prerequisiteTrailIds: data.prerequisiteTrailIds ?? [],
      order: data.order ?? 0,

      thumbnailUrl: data.thumbnailUrl,

      workloadHours: data.workloadHours ?? 0,
      estimatedMinutes: data.estimatedMinutes ?? 0,

      featured: data.featured ?? false,

      totalModules: data.totalModules ?? 0,
      totalLessons: data.totalLessons ?? 0,

      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      responsibleInstructorId: data.responsibleInstructorId,
      version: data.version ?? 1,

      metrics: data.metrics
        ? {
            views: data.metrics.views ?? 0,
            enrollments: data.metrics.enrollments ?? 0,
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
