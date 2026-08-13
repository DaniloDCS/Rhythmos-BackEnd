import { Timestamp, type DocumentData } from "firebase-admin/firestore";

export interface ILevel {
  id?: string;
  name: string;
  description?: string;
  levelNumber: number;
  xpMin: number;
  xpMax: number;
  badgeName?: string;
  badgeImageUrl?: string;
  rewardIds: string[];
  active: boolean;
  featured?: boolean;
  color?: string;
  icon?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

const normalizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
};

export class Level implements ILevel {
  id?: string;
  name: string;
  description?: string;
  levelNumber: number;
  xpMin: number;
  xpMax: number;
  badgeName?: string;
  badgeImageUrl?: string;
  rewardIds: string[];
  active: boolean;
  featured?: boolean;
  color?: string;
  icon?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  constructor(data: Partial<ILevel>) {
    this.id = data.id;
    this.name = data.name?.trim() ?? "Novo nível";
    this.description = data.description?.trim() ?? "";
    this.levelNumber = data.levelNumber ?? 1;
    this.xpMin = data.xpMin ?? 0;
    this.xpMax = data.xpMax ?? 100;
    this.badgeName = data.badgeName?.trim() ?? "";
    this.badgeImageUrl = data.badgeImageUrl?.trim() ?? "";
    this.rewardIds = normalizeIds(data.rewardIds);
    this.active = data.active ?? true;
    this.featured = data.featured ?? false;
    this.color = data.color?.trim() ?? "";
    this.icon = data.icon?.trim() ?? "";
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
  }

  update(data: Partial<Omit<ILevel, "id" | "createdAt">>, userId?: string) {
    Object.assign(this, data);
    this.name = this.name?.trim() ?? "Novo nível";
    this.description = this.description?.trim() ?? "";
    this.badgeName = this.badgeName?.trim() ?? "";
    this.badgeImageUrl = this.badgeImageUrl?.trim() ?? "";
    this.color = this.color?.trim() ?? "";
    this.icon = this.icon?.trim() ?? "";
    this.rewardIds = normalizeIds(this.rewardIds);
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
      throw new Error("O nome do nível é obrigatório.");
    }

    if (this.levelNumber <= 0) {
      throw new Error("O número do nível deve ser maior que zero.");
    }

    if (this.xpMin < 0) {
      throw new Error("O XP mínimo não pode ser negativo.");
    }

    if (this.xpMax < 0) {
      throw new Error("O XP máximo não pode ser negativo.");
    }

    if (this.xpMax <= this.xpMin) {
      throw new Error("O XP máximo deve ser maior que o XP mínimo.");
    }
  }

  containsXp(xp: number): boolean {
    return xp >= this.xpMin && xp <= this.xpMax;
  }

  getProgressInLevel(userXp: number): number {
    if (userXp <= this.xpMin) return 0;
    if (userXp >= this.xpMax) return 100;
    const total = this.xpMax - this.xpMin;
    const current = userXp - this.xpMin;
    return Number(((current / total) * 100).toFixed(2));
  }

  private touch() {
    this.updatedAt = Timestamp.now();
  }

  toObject() {
    return {
      id: this.id ?? null,
      name: this.name,
      description: this.description ?? null,
      levelNumber: this.levelNumber,
      xpMin: this.xpMin,
      xpMax: this.xpMax,
      badgeName: this.badgeName ?? null,
      badgeImageUrl: this.badgeImageUrl ?? null,
      rewardIds: this.rewardIds,
      active: this.active,
      featured: this.featured ?? false,
      color: this.color ?? null,
      icon: this.icon ?? null,
      createdBy: this.createdBy ?? null,
      updatedBy: this.updatedBy ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt ?? null,
    };
  }

  static fromFirestore(id: string, data: DocumentData): Level {
    return new Level({
      id,
      name: data.name,
      description: data.description,
      levelNumber: data.levelNumber ?? 1,
      xpMin: data.xpMin ?? 0,
      xpMax: data.xpMax ?? 100,
      badgeName: data.badgeName,
      badgeImageUrl: data.badgeImageUrl,
      rewardIds: normalizeIds(data.rewardIds),
      active: data.active ?? true,
      featured: data.featured ?? false,
      color: data.color,
      icon: data.icon,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
