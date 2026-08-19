import type { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { parseBoolean } from "../../utils/parse";
import {
  Announcement,
  type AnnouncementAudience,
  type AnnouncementPriority,
  type AnnouncementStatus,
} from "./announcement.model";
import { emitAnnouncementChange } from "../../realtime/socket";

const COLLECTION = "announcements";
const STATUSES: AnnouncementStatus[] = ["draft", "published", "archived"];
const PRIORITIES: AnnouncementPriority[] = ["info", "important", "urgent"];
const AUDIENCES: AnnouncementAudience[] = ["all", "students", "administrators"];

const parseDate = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("Informe uma data válida.");
  return Timestamp.fromDate(date);
};

const buildAnnouncement = (body: Record<string, any>, current?: Announcement) => {
  const status = (body.status ?? current?.status ?? "draft") as AnnouncementStatus;
  const priority = (body.priority ?? current?.priority ?? "info") as AnnouncementPriority;
  const audience = (body.audience ?? current?.audience ?? "all") as AnnouncementAudience;
  if (!STATUSES.includes(status)) throw new Error("Status de comunicado inválido.");
  if (!PRIORITIES.includes(priority)) throw new Error("Prioridade inválida.");
  if (!AUDIENCES.includes(audience)) throw new Error("Público-alvo inválido.");

  return new Announcement({
    ...current,
    title: body.title ?? current?.title,
    description: body.description ?? current?.description,
    status,
    priority,
    audience,
    startsAt: body.startsAt !== undefined ? parseDate(body.startsAt) : current?.startsAt,
    endsAt: body.endsAt !== undefined ? parseDate(body.endsAt) : current?.endsAt,
    actionLabel: body.actionLabel ?? current?.actionLabel,
    actionUrl: body.actionUrl ?? current?.actionUrl,
    color: body.color ?? current?.color,
    pinned: parseBoolean(body.pinned, current?.pinned ?? false),
  });
};

export const listAnnouncementsAdmin = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
    return res.json(snapshot.docs.map((doc) => Announcement.fromFirestore(doc.id, doc.data()).toObject()));
  } catch (error) {
    return res.status(500).json({ message: "Erro ao carregar comunicados.", error: error instanceof Error ? error.message : String(error) });
  }
};

export const createAnnouncementAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ref = db.collection(COLLECTION).doc();
    const announcement = buildAnnouncement(req.body);
    announcement.id = ref.id;
    announcement.createdBy = req.user?.uid;
    announcement.validate();
    await ref.set(announcement.toObject());
    emitAnnouncementChange(announcement.audience, { action: "created", announcement: announcement.toObject() }, announcement.status === "published" ? { type: "announcement", title: announcement.title, message: announcement.description, path: "/dashboard" } : undefined);
    return res.status(201).json(announcement.toObject());
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Erro ao criar comunicado." });
  }
};

export const updateAnnouncementAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ message: "Comunicado não encontrado." });
    const announcement = buildAnnouncement(req.body, Announcement.fromFirestore(snapshot.id, snapshot.data()!));
    announcement.updatedBy = req.user?.uid;
    announcement.updatedAt = Timestamp.now();
    announcement.validate();
    await ref.set(announcement.toObject(), { merge: true });
    emitAnnouncementChange(announcement.audience, { action: "updated", announcement: announcement.toObject() }, announcement.status === "published" ? { type: "announcement", title: announcement.title, message: announcement.description, path: "/dashboard" } : undefined);
    return res.json({ message: "Comunicado atualizado com sucesso.", announcement: announcement.toObject() });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Erro ao atualizar comunicado." });
  }
};

export const deleteAnnouncementAdmin = async (req: AuthenticatedRequest, res: Response) => {
  const ref = db.collection(COLLECTION).doc(req.params.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return res.status(404).json({ message: "Comunicado não encontrado." });
  await ref.delete();
  const removed = Announcement.fromFirestore(snapshot.id, snapshot.data()!);
  emitAnnouncementChange(removed.audience, { action: "deleted", announcementId: removed.id });
  return res.json({ message: "Comunicado excluído com sucesso." });
};
