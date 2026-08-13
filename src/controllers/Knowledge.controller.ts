import { Request, Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";

const COLLECTION = "knowledge_articles";

const ALLOWED_STATUS = new Set(["rascunho", "publicado", "arquivado"]);

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function sanitizeArticleBody(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const requestedSlug = String(body.slug ?? "").trim();

  return {
    ...body,
    title,
    slug: slugify(requestedSlug || title),
    summary: String(body.summary ?? "").trim(),
    category: String(body.category ?? "fundamentos"),
    subcategory: body.subcategory ? String(body.subcategory).trim() : "",
    level: String(body.level ?? "basico"),
    tags: stringArray(body.tags),
    status: ALLOWED_STATUS.has(String(body.status)) ? String(body.status) : "rascunho",
    featured: booleanValue(body.featured),
    order: numberValue(body.order),
    icon: body.icon ? String(body.icon) : "fi fi-rr-book-open-cover",
    thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : "",
    content: Array.isArray(body.content) ? body.content : [],
    quickFacts: Array.isArray(body.quickFacts) ? body.quickFacts : [],
    recognitionSteps: stringArray(body.recognitionSteps),
    commonMistakes: stringArray(body.commonMistakes),
    relatedArticleIds: stringArray(body.relatedArticleIds),
    actions: Array.isArray(body.actions) ? body.actions : [],
    ecg:
      body.ecg && typeof body.ecg === "object"
        ? body.ecg
        : { enabled: false },
  };
}

async function ensureUniqueSlug(slug: string, ignoreId?: string) {
  if (!slug) throw new Error("Slug inválido.");

  const snapshot = await db
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .limit(2)
    .get();

  const duplicate = snapshot.docs.find((doc) => doc.id !== ignoreId);

  if (duplicate) {
    throw new Error("Já existe uma ficha com este slug.");
  }
}

export const createKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const data = sanitizeArticleBody(req.body ?? {});

    if (!data.title || !data.summary) {
      return res.status(400).json({
        message: "title e summary são obrigatórios.",
      });
    }

    await ensureUniqueSlug(data.slug);

    const ref = db.collection(COLLECTION).doc();
    const now = Timestamp.now();

    const article = {
      id: ref.id,
      ...data,
      views: 0,
      createdBy: req.body.createdBy ?? null,
      updatedBy: req.body.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
      publishedAt: data.status === "publicado" ? now : null,
    };

    await ref.set(article);

    return res.status(201).json(article);
  } catch (err) {
    console.error("Erro ao criar ficha da enciclopédia:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao criar ficha.",
    });
  }
};

export const getKnowledgeAdmin = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection(COLLECTION).orderBy("order", "asc").get();

    const articles = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
        return String(a.title ?? "").localeCompare(String(b.title ?? ""), "pt-BR");
      });

    return res.status(200).json(articles);
  } catch (err) {
    console.error("Erro ao listar fichas:", err);
    return res.status(500).json({ message: "Erro ao listar fichas." });
  }
};

export const getKnowledgeByIdAdmin = async (req: Request, res: Response) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Ficha não encontrada." });
    }

    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("Erro ao buscar ficha:", err);
    return res.status(500).json({ message: "Erro ao buscar ficha." });
  }
};

export const updateKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ref = db.collection(COLLECTION).doc(id);
    const current = await ref.get();

    if (!current.exists) {
      return res.status(404).json({ message: "Ficha não encontrada." });
    }

    const previous = current.data() ?? {};
    const merged = sanitizeArticleBody({ ...previous, ...req.body });

    if (!merged.title || !merged.summary) {
      return res.status(400).json({ message: "title e summary são obrigatórios." });
    }

    await ensureUniqueSlug(merged.slug, id);

    const update = {
      ...merged,
      id,
      views: previous.views ?? 0,
      createdBy: previous.createdBy ?? null,
      createdAt: previous.createdAt ?? Timestamp.now(),
      updatedBy: req.body.updatedBy ?? previous.updatedBy ?? null,
      updatedAt: Timestamp.now(),
      publishedAt:
        merged.status === "publicado"
          ? previous.publishedAt ?? Timestamp.now()
          : previous.publishedAt ?? null,
    };

    await ref.set(update, { merge: true });

    return res.status(200).json(update);
  } catch (err) {
    console.error("Erro ao atualizar ficha:", err);
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Erro ao atualizar ficha.",
    });
  }
};

export const updateKnowledgeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = String(req.body.status ?? "");

    if (!ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    const ref = db.collection(COLLECTION).doc(id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Ficha não encontrada." });
    }

    const update: Record<string, unknown> = {
      status,
      updatedBy: req.body.updatedBy ?? null,
      updatedAt: Timestamp.now(),
    };

    if (status === "publicado" && !doc.data()?.publishedAt) {
      update.publishedAt = Timestamp.now();
    }

    await ref.set(update, { merge: true });

    const updated = await ref.get();
    return res.status(200).json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error("Erro ao alterar status:", err);
    return res.status(500).json({ message: "Erro ao alterar status." });
  }
};

export const deleteKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Ficha não encontrada." });
    }

    await ref.delete();
    return res.status(200).json({ message: "Ficha excluída com sucesso." });
  } catch (err) {
    console.error("Erro ao excluir ficha:", err);
    return res.status(500).json({ message: "Erro ao excluir ficha." });
  }
};

export const getPublishedKnowledge = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "publicado")
      .get();

    const articles = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          title: data.title,
          slug: data.slug,
          summary: data.summary,
          category: data.category,
          level: data.level,
          tags: data.tags ?? [],
          icon: data.icon,
          thumbnailUrl: data.thumbnailUrl,
          featured: data.featured === true,
          order: data.order ?? 0,
        };
      })
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return String(a.title).localeCompare(String(b.title), "pt-BR");
      });

    return res.status(200).json(articles);
  } catch (err) {
    console.error("Erro ao buscar Atlas ECG:", err);
    return res.status(500).json({ message: "Erro ao buscar Atlas ECG." });
  }
};

export const getPublishedKnowledgeBySlug = async (req: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("slug", "==", req.params.slug)
      .where("status", "==", "publicado")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "Ficha não encontrada." });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    const relatedIds = stringArray(data.relatedArticleIds);
    const relatedArticles = (
      await Promise.all(
        relatedIds.slice(0, 8).map(async (relatedId) => {
          const related = await db.collection(COLLECTION).doc(relatedId).get();

          if (!related.exists || related.data()?.status !== "publicado") return null;

          const relatedData = related.data()!;
          return {
            id: related.id,
            title: relatedData.title,
            slug: relatedData.slug,
            summary: relatedData.summary,
            category: relatedData.category,
            level: relatedData.level,
            tags: relatedData.tags ?? [],
            icon: relatedData.icon,
            thumbnailUrl: relatedData.thumbnailUrl,
            featured: relatedData.featured === true,
          };
        }),
      )
    ).filter(Boolean);

    await doc.ref.set(
      {
        views: numberValue(data.views, 0) + 1,
      },
      { merge: true },
    );

    return res.status(200).json({
      id: doc.id,
      ...data,
      views: numberValue(data.views, 0) + 1,
      relatedArticles,
    });
  } catch (err) {
    console.error("Erro ao buscar ficha publicada:", err);
    return res.status(500).json({ message: "Erro ao buscar ficha publicada." });
  }
};
