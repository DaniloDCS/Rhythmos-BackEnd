import { Request, Response } from "express";
import { db } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";
import { Support } from "../models/Support";
import { IUser } from "../models/User";

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
      status,
      attachments,
    } = req.body;

    if (!userId || !title || !description) {
      return res.status(400).json({
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
      priority: priority ?? "normal", // Baixa | Normal | Alta | Urgente
      status: "aberto", // Aberto | Em andamento | Resolvido | Fechado
      messages: [
        {
          id: "msg-1",
          authorType: "usuario", // user | admin | system
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

    return res.status(201).json(support.toObject());
  } catch (err) {
    console.error("Erro ao criar chamado:", err);
    return res.status(500).json({ error: "Erro ao criar chamado" });
  }
};

// ✅ Admin: listar todos (com filtros opcionais)
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
    return res.status(500).json({ error: "Erro ao buscar chamados" });
  }
};

// ✅ Usuário: listar chamados do usuário
export const getSupportsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId é obrigatório" });
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
    return res
      .status(500)
      .json({ error: "Erro ao buscar chamados do usuário" });
  }
};

// ✅ Detalhe do chamado
export const getSupportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supportDoc = await db.collection("supports").doc(id).get();

    if (!supportDoc.exists) {
      return res.status(404).json({ message: "Chamado não encontrado" });
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
    return res.status(500).json({ error: "Erro ao buscar chamado" });
  }
};

// ✅ Atualizar dados do chamado (status, prioridade, etc.)
export const updateSupport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supportRef = db.collection("supports").doc(id);
    const doc = await supportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Chamado não encontrado" });
    }

    const now = Timestamp.now();

    // Se estiver fechando, marca closedAt
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
    return res.status(500).json({ error: "Erro ao atualizar chamado" });
  }
};

// ✅ Adicionar mensagem (reply) - serve pra usuário e admin

// ✅ Excluir chamado
export const deleteSupport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supportRef = db.collection("supports").doc(id);
    const doc = await supportRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Chamado não encontrado" });
    }

    await supportRef.delete();

    return res.status(200).json({ message: "Chamado excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir chamado:", err);
    return res.status(500).json({ error: "Erro ao excluir chamado" });
  }
};
