import type {
  ICreateSketchbookTab,
  ISketchbookTab,
  IUpdateSketchbookTab,
} from "./sketchbook.interface";
import {
  SketchbookRepository,
  sketchbookRepository,
} from "./sketchbook.repository";

const DEFAULT_COLOR = "#7c3aed";
const MAX_TITLE_LENGTH = 48;
const MAX_CONTENT_LENGTH = 50_000;

const normalizeTitle = (value?: string) => {
  const title = (value ?? "Anotações").trim();

  if (!title) throw new Error("SKETCHBOOK_INVALID_TITLE");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error("SKETCHBOOK_TITLE_TOO_LONG");
  }

  return title;
};

const normalizeColor = (value?: string) => {
  const color = (value ?? DEFAULT_COLOR).trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("SKETCHBOOK_INVALID_COLOR");
  }

  return color;
};

const normalizeContent = (value?: string) => {
  const content = value ?? "";

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error("SKETCHBOOK_CONTENT_TOO_LONG");
  }

  return content;
};

export class SketchbookService {
  constructor(
    private readonly repository: SketchbookRepository = sketchbookRepository,
  ) {}

  async list(userId: string): Promise<ISketchbookTab[]> {
    return this.repository.list(userId);
  }

  async create(
    userId: string,
    input: ICreateSketchbookTab,
  ): Promise<ISketchbookTab> {
    const tabs = await this.repository.list(userId);

    const nextOrder =
      tabs.length === 0
        ? 0
        : Math.max(...tabs.map((tab) => tab.order ?? 0)) + 1;

    return this.repository.create(userId, {
      title: normalizeTitle(input.title),
      color: normalizeColor(input.color),
      content: normalizeContent(input.content),
      order: nextOrder,
    });
  }

  async update(
    userId: string,
    tabId: string,
    input: IUpdateSketchbookTab,
  ): Promise<ISketchbookTab | null> {
    const patch: IUpdateSketchbookTab = {};

    if (input.title !== undefined) {
      patch.title = normalizeTitle(input.title);
    }

    if (input.color !== undefined) {
      patch.color = normalizeColor(input.color);
    }

    if (input.content !== undefined) {
      patch.content = normalizeContent(input.content);
    }

    if (input.order !== undefined) {
      if (!Number.isFinite(input.order) || input.order < 0) {
        throw new Error("SKETCHBOOK_INVALID_ORDER");
      }

      patch.order = Math.floor(input.order);
    }

    return this.repository.update(userId, tabId, patch);
  }

  async delete(userId: string, tabId: string): Promise<boolean> {
    return this.repository.delete(userId, tabId);
  }
}

export const sketchbookService = new SketchbookService();
