import type { Request, Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { parseBoolean, parseNumber } from "../../utils/parse";
import { XP_ACTIVITY_RULES_COLLECTION } from "./xp-activity-rule.service";
import type { IXpActivityRule, XpActivityCategory } from "./xp-activity-rule.types";

const categories = new Set<XpActivityCategory>(["trilhas", "aulas", "jogos", "quizzes", "simulacoes", "streak", "outros"]);
const normalizeKey = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
const serialize = (id: string, data: FirebaseFirestore.DocumentData) => ({ id, ...data });

const validate = (body: Request["body"]) => {
  const key = normalizeKey(body.key);
  const name = String(body.name ?? "").trim();
  const category = body.category as XpActivityCategory;
  const xp = parseNumber(body.xp, 0);
  const dailyLimit = body.dailyLimit === "" || body.dailyLimit == null ? null : parseNumber(body.dailyLimit, 0);
  if (!key || !name) throw new Error("Nome e identificador da atividade são obrigatórios.");
  if (!categories.has(category)) throw new Error("Categoria de atividade inválida.");
  if (xp < 0) throw new Error("O XP não pode ser negativo.");
  if (dailyLimit !== null && dailyLimit < 1) throw new Error("O limite diário deve ser maior que zero.");
  return { key, name, category, xp, dailyLimit };
};

const ensureUniqueKey = async (key: string, ignoredId?: string) => {
  const snapshot = await db.collection(XP_ACTIVITY_RULES_COLLECTION).where("key", "==", key).get();
  if (snapshot.docs.some((item) => item.id !== ignoredId)) throw new Error("Já existe uma regra com este identificador.");
};

export const listXpActivityRules = async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection(XP_ACTIVITY_RULES_COLLECTION).orderBy("order", "asc").get();
    return res.json(snapshot.docs.map((item) => serialize(item.id, item.data())));
  } catch (error) { return res.status(500).json({ message: "Erro ao buscar regras de XP.", error: error instanceof Error ? error.message : String(error) }); }
};

export const createXpActivityRule = async (req: Request, res: Response) => {
  try {
    const values = validate(req.body); await ensureUniqueKey(values.key);
    const ref = db.collection(XP_ACTIVITY_RULES_COLLECTION).doc();
    const rule: Omit<IXpActivityRule, "id"> = { ...values, description: String(req.body.description ?? "").trim(), active: parseBoolean(req.body.active, true), repeatable: parseBoolean(req.body.repeatable, false), order: parseNumber(req.body.order, 0), createdBy: req.body.createdBy, createdAt: Timestamp.now() };
    await ref.set(rule); return res.status(201).json({ id: ref.id, ...rule });
  } catch (error) { const message = error instanceof Error ? error.message : String(error); return res.status(message.startsWith("Já existe") ? 409 : 400).json({ message, error: "VALIDATION_ERROR" }); }
};

export const updateXpActivityRule = async (req: Request, res: Response) => {
  try {
    const ref = db.collection(XP_ACTIVITY_RULES_COLLECTION).doc(req.params.id); const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ message: "Regra de XP não encontrada.", error: "NOT_FOUND" });
    const current = snapshot.data()!; const values = validate({ ...current, ...req.body }); await ensureUniqueKey(values.key, ref.id);
    const update = { ...values, description: String(req.body.description ?? current.description ?? "").trim(), active: parseBoolean(req.body.active, current.active ?? true), repeatable: parseBoolean(req.body.repeatable, current.repeatable ?? false), order: parseNumber(req.body.order, current.order ?? 0), updatedBy: req.body.updatedBy, updatedAt: Timestamp.now() };
    await ref.set(update, { merge: true }); return res.json({ message: "Regra de XP atualizada.", rule: { id: ref.id, ...current, ...update } });
  } catch (error) { const message = error instanceof Error ? error.message : String(error); return res.status(message.startsWith("Já existe") ? 409 : 400).json({ message, error: "VALIDATION_ERROR" }); }
};

export const deleteXpActivityRule = async (req: Request, res: Response) => {
  const ref = db.collection(XP_ACTIVITY_RULES_COLLECTION).doc(req.params.id); const snapshot = await ref.get();
  if (!snapshot.exists) return res.status(404).json({ message: "Regra de XP não encontrada.", error: "NOT_FOUND" });
  await ref.delete(); return res.json({ message: "Regra de XP excluída." });
};
