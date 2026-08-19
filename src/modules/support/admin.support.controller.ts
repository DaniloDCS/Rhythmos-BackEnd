import { Request, Response } from "express";

import { db } from "../../config/firebase";

import { Timestamp } from "firebase-admin/firestore";

import { Support } from "./support.model";

import { IUser } from "../users/user.model";
import { emitRealtimeNotification, emitSupportUpdate } from "../../realtime/socket";

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

    const updated = await supportRef.get();
    emitSupportUpdate(id, { id: updated.id, ...updated.data() }, req.body?.messages ? "support:message" : "support:status");
    if (req.body?.messages) emitRealtimeNotification(String(updated.data()?.userId ?? ""), { type: "support_message", title: "Nova resposta no suporte", message: `O chamado “${updated.data()?.title ?? "Suporte"}” recebeu uma resposta.`, path: "/supports", supportId: id });
    else if (req.body?.status) emitRealtimeNotification(String(updated.data()?.userId ?? ""), { type: "support_status", title: "Status do chamado atualizado", message: `Seu chamado agora está como ${req.body.status}.`, path: "/supports", supportId: id });

    return res.status(200).json({ message: "Chamado atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar chamado:", err);
    return res.status(500).json({
      message: "Erro ao atualizar chamado",
      error: err instanceof Error ? err.message : String(err),
    });
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
