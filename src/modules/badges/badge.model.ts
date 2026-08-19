import { Timestamp } from "firebase-admin/firestore";

import type { BadgeRarity, IBadgeCondition, IBadge } from "./badge.types";

export type {
  BadgeRarity,
  BadgeConditionType,
  IBadgeCondition,
  IBadge,
} from "./badge.types";

export class Badge implements IBadge {
  id?: string;

  name: string;
  slug?: string;
  description?: string;

  fullImageUrl?: string;
  silhouetteImageUrl?: string;
  icon?: string;
  color?: string;

  rarity?: BadgeRarity;
  order: number;
  active: boolean;
  featured?: boolean;

  condition?: IBadgeCondition;

  createdBy?: string;
  updatedBy?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp;

  constructor(data: Partial<IBadge>) {
    this.id = data.id;

    this.name = data.name?.trim() ?? "Nova insígnia";
    this.slug = data.slug?.trim() ?? this.generateSlug(this.name);
    this.description = data.description?.trim() ?? "";

    this.fullImageUrl = data.fullImageUrl?.trim() ?? "";
    this.silhouetteImageUrl = data.silhouetteImageUrl?.trim() ?? "";
    this.icon = data.icon?.trim() ?? "";
    this.color = data.color?.trim() ?? "";

    this.rarity = data.rarity ?? "Comum";
    this.order = data.order ?? 0;
    this.active = data.active ?? true;
    this.featured = data.featured ?? false;

    this.condition = data.condition
      ? {
          type: data.condition.type ?? "manual",
          value: Number(data.condition.value ?? 0),
        }
      : {
          type: "manual",
          value: 0,
        };

    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;

    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
  }

  update(data: Partial<Omit<IBadge, "id" | "createdAt">>, userId?: string) {
    Object.assign(this, data);

    this.name = this.name?.trim() ?? "Nova insígnia";
    this.slug = data.slug?.trim() ?? this.generateSlug(this.name);
    this.description = this.description?.trim() ?? "";
    this.fullImageUrl = this.fullImageUrl?.trim() ?? "";
    this.silhouetteImageUrl = this.silhouetteImageUrl?.trim() ?? "";
    this.icon = this.icon?.trim() ?? "";
    this.color = this.color?.trim() ?? "";

    this.condition = this.condition
      ? {
          type: this.condition.type ?? "manual",
          value: Number(this.condition.value ?? 0),
        }
      : {
          type: "manual",
          value: 0,
        };

    if (userId) this.updatedBy = userId;

    this.validate();
    this.touch();
  }

  activate(userId?: string) {
    this.active = true;
    if (userId) this.updatedBy = userId;
    this.touch();
  }

  deactivate(userId?: string) {
    this.active = false;
    if (userId) this.updatedBy = userId;
    this.touch();
  }

  validate() {
    if (!this.name.trim()) {
      throw new Error("O nome da insígnia é obrigatório.");
    }

    if (this.order < 0) {
      throw new Error("A ordem da insígnia não pode ser negativa.");
    }

    if ((this.condition?.value ?? 0) < 0) {
      throw new Error("O valor da condição não pode ser negativo.");
    }
  }

  private touch() {
    this.updatedAt = Timestamp.now();
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
      name: this.name,
      slug: this.slug ?? null,
      description: this.description ?? null,
      fullImageUrl: this.fullImageUrl ?? null,
      silhouetteImageUrl: this.silhouetteImageUrl ?? null,
      icon: this.icon ?? null,
      color: this.color ?? null,
      rarity: this.rarity ?? "Comum",
      order: this.order,
      active: this.active,
      featured: this.featured ?? false,
      condition: this.condition ?? null,
      createdBy: this.createdBy ?? null,
      updatedBy: this.updatedBy ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt ?? null,
    };
  }

  static fromFirestore(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): Badge {
    return new Badge({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      fullImageUrl: data.fullImageUrl,
      silhouetteImageUrl: data.silhouetteImageUrl,
      icon: data.icon,
      color: data.color,
      rarity: data.rarity,
      order: data.order ?? 0,
      active: data.active ?? true,
      featured: data.featured ?? false,
      condition: data.condition,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
