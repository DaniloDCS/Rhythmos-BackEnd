import { Request, Response } from "express";
import { db } from "../../config/firebase";
import { Timestamp } from "firebase-admin/firestore";
import { Support } from "./support.model";
import { IUser } from "../users/user.model";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { emitRealtimeNotification, emitSupportUpdate } from "../../realtime/socket";

export const createSupport = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      title,
      description,
      category,
      priority,
    } = req.body;

    if (!userId || !title || !description) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId, title e description são obrigatórios",
      });
    }

    const supportRef = db.collection("supports").doc();
    const supportId = supportRef.id;

    const now = Timestamp.now();

    const support = new Support({
      id: supportId,
      userId,
      userName,
      userEmail,
      title,
      description,
      category: category ?? "geral",
      priority: priority ?? "normal",
      status: "aberto",
      messages: [
        {
          id: "msg-1",
          authorType: "usuario",
          authorId: userId,
          text: description,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      closedAt: null,
    });

    await supportRef.set(support.toObject());
    emitSupportUpdate(support.id!, support.toObject(), "support:message");
    emitRealtimeNotification("administrators", { type: "support_message", title: "Novo chamado de suporte", message: `${support.userName || "Usuário"}: ${description.slice(0, 120)}`, path: `/admin/support/${support.id}`, supportId: support.id });

    return res.status(201).json(support.toObject());
  } catch (err) {
    console.error("Erro ao criar chamado:", err);
    return res.status(500).json({
      message: "Erro ao criar chamado",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getAllSupports = async (req: Request, res: Response) => {
  try {
    const { status, priority, category } = req.query;

    let query: FirebaseFirestore.Query = db
      .collection("supports")
      .orderBy("createdAt", "desc");

    if (status) query = query.where("status", "==", String(status));
    if (priority) query = query.where("priority", "==", String(priority));
    if (category) query = query.where("category", "==", String(category));

    const snapshot = await query.get();

    const supports = snapshot.docs.map((doc) =>
      Support.fromFirestore(doc.id, doc.data()!).toObject(),
    );

    type UserWithId = IUser & { id: string };

    const userIds = [
      ...new Set(
        supports
          .map((support) => support.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    ];

    const usersMap = new Map<string, UserWithId>();

    await Promise.all(
      userIds.map(async (userId) => {
        const userDoc = await db.collection("users").doc(userId).get();

        if (userDoc.exists) {
          usersMap.set(userId, {
            id: userDoc.id,
            ...(userDoc.data() as IUser),
          });
        }
      }),
    );

    const supportsWithUser = supports.map((support) => ({
      ...support,
      user: usersMap.get(support.userId) ?? null,
    }));

    return res.status(200).json(supportsWithUser);
  } catch (err) {
    console.error("Erro ao buscar chamados:", err);
    return res.status(500).json({
      message: "Erro ao buscar chamados",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getSupportsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "userId é obrigatório",
      });
    }

    let query: FirebaseFirestore.Query = db
      .collection("supports")
      .where("userId", "==", userId);

    const snapshot = await query.get();

    const supports = snapshot.docs.map((doc) =>
      Support.fromFirestore(doc.id, doc.data()!).toObject(),
    );

    return res.status(200).json(supports);
  } catch (err) {
    console.error("Erro ao buscar chamados do usuário:", err);
    return res.status(500).json({
      message: "Erro ao buscar chamados do usuário",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const getSupportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supportDoc = await db.collection("supports").doc(id).get();

    if (!supportDoc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Chamado não encontrado",
      });
    }

    const support = Support.fromFirestore(supportDoc.id, supportDoc.data()!);

    let user = null;

    if (support.userId) {
      const userDoc = await db.collection("users").doc(support.userId).get();

      if (userDoc.exists) {
        user = {
          id: userDoc.id,
          ...(userDoc.data() as IUser),
        };
      }
    }

    return res.status(200).json({
      ...support.toObject(),
      user,
    });
  } catch (err) {
    console.error("Erro ao buscar chamado:", err);
    return res.status(500).json({
      message: "Erro ao buscar chamado",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateSupport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supportRef = db.collection("supports").doc(id);
    const doc = await supportRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Chamado não encontrado",
      });
    }

    const now = Timestamp.now();

    const status = req.body?.status as string | undefined;
    const isClosing = status && ["Fechado", "Resolvido"].includes(status);

    await supportRef.update({
      ...req.body,
      updatedAt: now,
      ...(isClosing ? { closedAt: now } : {}),
    });

    return res.status(200).json({ message: "Chamado atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar chamado:", err);
    return res.status(500).json({
      message: "Erro ao atualizar chamado",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

export const replyToOwnSupport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Usuário não autenticado." });
    const text = String(req.body?.text ?? "").trim().slice(0, 2000);
    if (!text) return res.status(400).json({ message: "Digite uma mensagem para responder." });
    const supportRef = db.collection("supports").doc(req.params.id);
    const snapshot = await supportRef.get();
    if (!snapshot.exists) return res.status(404).json({ message: "Chamado não encontrado." });
    const support = Support.fromFirestore(snapshot.id, snapshot.data()!);
    if (support.userId !== req.user.uid) return res.status(403).json({ message: "Você não pode responder a este chamado." });
    if (["resolvido", "fechado"].includes(support.status)) return res.status(409).json({ message: "Este chamado já foi finalizado e não aceita novas mensagens." });
    const message = { id: "msg-" + Date.now(), authorType: "usuario" as const, authorId: req.user.uid, text, createdAt: Timestamp.now() };
    support.addMessage(message);
    if (support.status === "aguardando_usuario") support.status = "em_andamento";
    await supportRef.set(support.toObject());
    emitSupportUpdate(support.id!, support.toObject(), "support:message");
    emitRealtimeNotification("administrators", { type: "support_message", title: "Nova mensagem de suporte", message: `${support.userName || "Usuário"}: ${text.slice(0, 120)}`, path: `/admin/support/${support.id}`, supportId: support.id });
    return res.status(201).json({ message: "Resposta enviada.", support: support.toObject() });
  } catch (err) {
    console.error("Erro ao responder chamado:", err);
    return res.status(500).json({ message: "Não foi possível enviar a resposta.", error: err instanceof Error ? err.message : String(err) });
  }
};

export const deleteSupport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supportRef = db.collection("supports").doc(id);
    const doc = await supportRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Chamado não encontrado",
      });
    }

    await supportRef.delete();

    return res.status(200).json({ message: "Chamado excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir chamado:", err);
    return res.status(500).json({
      message: "Erro ao excluir chamado",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
