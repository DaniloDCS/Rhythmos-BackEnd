export type HeadingLevel = "H1" | "H2" | "H3" | "H4";
export type CalloutTone = "info" | "success" | "warning" | "danger";
export type ListStyle = "unordered" | "ordered";

export type IBlock =
  | { id: string; type: "Título"; level: HeadingLevel; content: string }
  | { id: string; type: "Parágrafo"; content: string }
  | { id: string; type: "Divisor"; content: string }
  | { id: string; type: "Lembrete"; content: string }
  | { id: string; type: "Citação"; content: string }
  | { id: string; type: "Link"; content: { text: string; href: string } }
  | {
      id: string;
      type: "Imagem";
      content: { src: string; alt: string; caption?: string };
    }
  | {
      id: string;
      type: "Vídeo";
      content: { src: string; title?: string };
    }
  | {
      id: string;
      type: "Arquivo";
      content: { name: string; url: string; extension?: string; size?: string };
    }
  | {
      id: string;
      type: "Tabela";
      content: { headers: string[]; rows: string[][] };
    }
  | {
      id: string;
      type: "Enquete";
      content: {
        question: string;
        multiple: boolean;
        options: Array<{ id: string; text: string }>;
        showResultsAfterVote?: boolean;
      };
    }
  | {
      id: string;
      type: "Questão";
      content: {
        question: string;
        multiple: boolean;
        options: Array<{ id: string; text: string; correct: boolean }>;
        explanation?: string;
      };
    }
  | {
      id: string;
      type: "Lista";
      content: { style: ListStyle; items: string[] };
    }
  | {
      id: string;
      type: "Destaque";
      content: { tone: CalloutTone; title?: string; text: string };
    }
  | {
      id: string;
      type: "Checklist";
      content: { items: Array<{ id: string; text: string }> };
    }
  | {
      id: string;
      type: "Acordeão";
      content: { items: Array<{ id: string; title: string; content: string }> };
    }
  | {
      id: string;
      type: "Flashcard";
      content: { front: string; back: string };
    };

const collectStrings = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(
      collectStrings,
    );
  }
  return [];
};

export const extractBlocksText = (blocks: IBlock[]): string =>
  blocks
    .flatMap((block) => collectStrings(block.content))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
