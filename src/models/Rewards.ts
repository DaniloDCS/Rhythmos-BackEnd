import { Timestamp, type DocumentData } from "firebase-admin/firestore";

export type RewardType =
  | "badge"
  | "unlock_game"
  | "unlock_trail"
  | "unlock_module"
  | "title"
  | "theme"
  | "xp_bonus"
  | "special_content"
  | "other";

export interface IReward {
  id?: string;

  name: string;
  description?: string;

  type: RewardType;
  value?: string;

  icon?: string;
  imageUrl?: string;
  color?: string;

  active: boolean;
  featured?: boolean;
  repeatable?: boolean;
  order: number;

  createdBy?: string;
  updatedBy?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

const UNLOCK_TYPES: RewardType[] = [
  "unlock_game",
  "unlock_trail",
  "unlock_module",
];

export class Reward implements IReward {
  id?: string;

  name: string;
  description?: string;

  type: RewardType;
  value?: string;

  icon?: string;
  imageUrl?: string;
  color?: string;

  active: boolean;
  featured?: boolean;
  repeatable?: boolean;
  order: number;

  createdBy?: string;
  updatedBy?: string;

  createdAt: Timestamp;
  updatedAt?: Timestamp;

  constructor(data: Partial<IReward>) {
    this.id = data.id;

    this.name = data.name?.trim() ?? "Nova recompensa";
    this.description = data.description?.trim() ?? "";

    this.type = data.type ?? "other";
    this.value = data.value?.trim() ?? "";

    this.icon = data.icon?.trim() ?? "";
    this.imageUrl = data.imageUrl?.trim() ?? "";
    this.color = data.color?.trim() ?? "";

    this.active = data.active ?? true;
    this.featured = data.featured ?? false;
    this.repeatable = data.repeatable ?? false;
    this.order = data.order ?? 0;

    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;

    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
  }

  update(data: Partial<Omit<IReward, "id" | "createdAt">>, userId?: string) {
    Object.assign(this, data);

    this.name = this.name?.trim() ?? "Nova recompensa";
    this.description = this.description?.trim() ?? "";
    this.value = this.value?.trim() ?? "";
    this.icon = this.icon?.trim() ?? "";
    this.imageUrl = this.imageUrl?.trim() ?? "";
    this.color = this.color?.trim() ?? "";

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
      throw new Error("O nome da recompensa é obrigatório.");
    }

    if (this.order < 0) {
      throw new Error("A ordem da recompensa não pode ser negativa.");
    }

    if (UNLOCK_TYPES.includes(this.type) && !this.value?.trim()) {
      throw new Error(
        "Recompensas de desbloqueio precisam apontar para um conteúdo.",
      );
    }

    if (UNLOCK_TYPES.includes(this.type) && this.repeatable) {
      throw new Error("Recompensas de desbloqueio não podem ser repetíveis.");
    }
  }

  private touch() {
    this.updatedAt = Timestamp.now();
  }

  toObject() {
    return {
      id: this.id ?? null,
      name: this.name,
      description: this.description ?? null,
      type: this.type,
      value: this.value ?? null,
      icon: this.icon ?? null,
      imageUrl: this.imageUrl ?? null,
      color: this.color ?? null,
      active: this.active,
      featured: this.featured ?? false,
      repeatable: this.repeatable ?? false,
      order: this.order,
      createdBy: this.createdBy ?? null,
      updatedBy: this.updatedBy ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt ?? null,
    };
  }

  static fromFirestore(id: string, data: DocumentData): Reward {
    return new Reward({
      id,
      name: data.name,
      description: data.description,
      type: data.type,
      value: data.value,
      icon: data.icon,
      imageUrl: data.imageUrl,
      color: data.color,
      active: data.active ?? true,
      featured: data.featured ?? false,
      repeatable: data.repeatable ?? false,
      order: data.order ?? 0,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
