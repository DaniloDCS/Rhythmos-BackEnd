import type { Response } from "express";
import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { Announcement } from "./announcement.model";

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const timestampMillis = (value: any, fallback: number) => {
  if (!value) return fallback;
  if (typeof value.toMillis === "function") return value.toMillis();
  const seconds = value._seconds ?? value.seconds;
  if (typeof seconds === "number") return seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const listActiveAnnouncements = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    const [userSnapshot, announcementsSnapshot] = await Promise.all([
      db.collection("users").doc(req.user.uid).get(),
      db.collection("announcements").get(),
    ]);

    const role = normalize(userSnapshot.data()?.role);
    const isAdmin = ["administrador", "admin"].includes(role);
    const now = Date.now();

    const announcements = announcementsSnapshot.docs
      .map((doc) => Announcement.fromFirestore(doc.id, doc.data()))
      .filter((announcement) => {
        const status = normalize(announcement.status);
        const audience = normalize(announcement.audience);
        const published = ["published", "publicado", "ativo"].includes(status);
        const audienceMatches =
          ["all", "todos", "geral"].includes(audience) ||
          (isAdmin && ["administrators", "administradores", "admin"].includes(audience)) ||
          (!isAdmin && ["students", "estudantes", "alunos", "usuarios"].includes(audience));

        return (
          published &&
          audienceMatches &&
          timestampMillis(announcement.startsAt, 0) <= now &&
          timestampMillis(announcement.endsAt, Number.POSITIVE_INFINITY) >= now
        );
      })
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          timestampMillis(b.createdAt, 0) - timestampMillis(a.createdAt, 0),
      )
      .map((announcement) => announcement.toObject());

    return res.status(200).json(announcements);
  } catch (error) {
    console.error("Erro ao carregar comunicados ativos:", error);
    return res.status(500).json({
      message: "Não foi possível carregar os comunicados.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
