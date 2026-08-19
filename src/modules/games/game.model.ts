import { Timestamp, DocumentData } from "firebase-admin/firestore";

import { TStatus } from "../../shared/domain.types";

import type { TGameDifficulty, TGameCategory, IGame } from "./game.types";

export type { TGameDifficulty, TGameCategory, IGame } from "./game.types";

const normalizeTags = (value: unknown): string[] => {
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

const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeCategory = (value: unknown): TGameCategory => {
  if (typeof value !== "string") return "outro";

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, TGameCategory> = {
    quiz: "quiz",
    associacao: "associacao",
    velocidade: "velocidade",
    memoria: "memoria",
    arraste_e_solte: "arraste_e_solte",
    outro: "outro",
  };

  return aliases[normalized] ?? "outro";
};

const normalizeDifficulty = (value: unknown): TGameDifficulty => {
  if (typeof value !== "string") return "facil";

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const aliases: Record<string, TGameDifficulty> = {
    facil: "facil",
    medio: "medio",
    dificil: "dificil",
  };

  return aliases[normalized] ?? "facil";
};

const normalizeStatus = (value: unknown): TStatus => {
  if (typeof value !== "string") return "em_construcao" as TStatus;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const aliases: Record<string, string> = {
    disponivel: "disponivel",
    indisponivel: "indisponivel",
    em_construcao: "em_construcao",
    em_atualizacao: "em_atualizacao",
  };

  return (aliases[normalized] ?? normalized) as TStatus;
};

export class Game implements IGame {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  category?: TGameCategory;
  difficulty?: TGameDifficulty;
  status: TStatus;
  featured?: boolean;
  players?: number;
  xpReward: number;
  tags?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  constructor(data: Partial<IGame>) {
    this.id = data.id?.trim() ?? "";
    this.name = data.name?.trim() ?? "Novo jogo";
    this.slug = slugify(data.slug?.trim() || this.name);
    this.description = data.description?.trim() ?? "";
    this.shortDescription = data.shortDescription?.trim() ?? "";
    this.thumbnailUrl = data.thumbnailUrl?.trim() ?? "";
    this.category = normalizeCategory(data.category);
    this.difficulty = normalizeDifficulty(data.difficulty);
    this.status = normalizeStatus(data.status ?? "em_construcao");
    this.featured = data.featured ?? false;
    this.players = Math.max(0, Number(data.players ?? 0));
    this.xpReward = Math.max(0, Number(data.xpReward ?? 0));
    this.tags = normalizeTags(data.tags);
    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt;
  }

  update(data: Partial<Omit<IGame, "id" | "createdAt">>) {
    if (data.name !== undefined) this.name = data.name.trim();

    if (data.slug !== undefined) {
      this.slug = slugify(data.slug || this.name);
    } else if (!this.slug) {
      this.slug = slugify(this.name);
    }

    if (data.description !== undefined) {
      this.description = data.description?.trim() ?? "";
    }

    if (data.shortDescription !== undefined) {
      this.shortDescription = data.shortDescription?.trim() ?? "";
    }

    if (data.thumbnailUrl !== undefined) {
      this.thumbnailUrl = data.thumbnailUrl?.trim() ?? "";
    }

    if (data.category !== undefined) {
      this.category = normalizeCategory(data.category);
    }

    if (data.difficulty !== undefined) {
      this.difficulty = normalizeDifficulty(data.difficulty);
    }
    if (data.status !== undefined) this.status = normalizeStatus(data.status);
    if (data.featured !== undefined) this.featured = Boolean(data.featured);

    if (data.players !== undefined) {
      this.players = Math.max(0, Number(data.players));
    }

    if (data.xpReward !== undefined) {
      this.xpReward = Math.max(0, Number(data.xpReward));
    }

    if (data.tags !== undefined) this.tags = normalizeTags(data.tags);

    this.validate();
    this.touch();
  }

  validate() {
    if (!this.id.trim()) {
      throw new Error("O ID do jogo é obrigatório.");
    }

    if (!this.name.trim()) {
      throw new Error("O nome do jogo é obrigatório.");
    }

    if (!this.slug.trim()) {
      throw new Error("O slug do jogo é obrigatório.");
    }

    if (this.xpReward < 0) {
      throw new Error("O XP do jogo não pode ser negativo.");
    }

    if ((this.players ?? 0) < 0) {
      throw new Error("A quantidade de jogadores não pode ser negativa.");
    }
  }

  private touch() {
    this.updatedAt = Timestamp.now();
  }

  toObject() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description ?? null,
      shortDescription: this.shortDescription ?? null,
      thumbnailUrl: this.thumbnailUrl ?? null,
      category: this.category ?? "outro",
      difficulty: this.difficulty ?? "facil",
      status: this.status,
      featured: this.featured ?? false,
      players: this.players ?? 0,
      xpReward: this.xpReward,
      tags: this.tags ?? [],
      createdAt: this.createdAt ?? Timestamp.now(),
      updatedAt: this.updatedAt ?? null,
    };
  }

  static fromFirestore(id: string, data: DocumentData): Game {
    return new Game({
      id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,
      thumbnailUrl: data.thumbnailUrl,
      category: normalizeCategory(data.category),
      difficulty: normalizeDifficulty(data.difficulty),
      status: normalizeStatus(data.status),
      featured: data.featured ?? false,
      players: data.players ?? 0,

      xpReward: data.xpReward ?? data.xpBaseReward ?? 0,

      tags: data.tags ?? [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
