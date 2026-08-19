import { Request, Response } from "express";

import admin from "firebase-admin";

import { db, auth } from "../../config/firebase";

import { IUser } from "./user.model";

import { normalizeUsername } from "../../utils/helpers";

import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { AcademicIndicesService } from "../enrollments/academic-indices.service";
import type { IEnrollment } from "../enrollments/enrollment.types";

export const getUserLearningHistory = async (req: Request, res: Response) => {
  try {
    const userDoc = await db.collection("users").doc(req.params.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "NOT_FOUND", message: "Usuário não encontrado." });
    const snapshot = await db.collection("enrollments").where("userId", "==", req.params.id).get();
    const enrollments = await Promise.all(snapshot.docs.map(async (doc) => {
      const enrollment = { id: doc.id, ...doc.data() } as IEnrollment & { id: string };
      return { ...enrollment, academicIndices: await AcademicIndicesService.calculate(enrollment) };
    }));
    return res.status(200).json({ user: { id: userDoc.id, ...userDoc.data() }, enrollments });
  } catch (caught) {
    return res.status(500).json({ message: "Erro ao preparar o histórico completo do usuário.", error: caught instanceof Error ? caught.message : String(caught) });
  }
};

export const createUser = async (req: Request, res: Response) => {
  let createdAuthUid: string | null = null;
  try {
    const { username, name, email, password, biography, role } = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Nome, username, email e senha são obrigatórios.",
      });
    }
    if (String(password).length < 6) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "A senha deve ter pelo menos 6 caracteres.",
      });
    }
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = String(email).trim().toLowerCase();
    const usernameRef = db.collection("usernames").doc(normalizedUsername);
    const emailRef = db.collection("emails").doc(normalizedEmail);
    const usernameDoc = await usernameRef.get();
    if (usernameDoc.exists) {
      return res
        .status(400)
        .json({ error: "VALIDATION_ERROR", message: "Username já existe." });
    }
    const emailDoc = await emailRef.get();
    if (emailDoc.exists) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Email já está em uso.",
      });
    }
    const userRecord = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: name,
    });
    createdAuthUid = userRecord.uid;
    const userRef = db.collection("users").doc(createdAuthUid);
    const userProgressRef = db.collection("user_progress").doc(createdAuthUid);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const userData = {
      id: createdAuthUid,
      authUid: createdAuthUid,
      username: normalizedUsername,
      name,
      email: normalizedEmail,
      role: role || "usuario",
      theme: "theme-ebsher",
      location: "",
      visits: 0,
      biography: biography || "❤️ Eu amo aprender com o Rhythmos!",
      createdAt: now,
      updatedAt: now,
    };
    const userProgressData = {
      id: createdAuthUid,
      userId: createdAuthUid,
      xp: {
        total: 0,
        currentLevelXp: 0,
        nextLevelXp: 100,
      },
      level: {
        current: 1,
        currentTitle: "Iniciante",
        progressPercent: 0,
      },
      levels: [
        {
          level: 1,
          title: "Iniciante",
          unlocked: true,
          reachedAt: new Date(),
        },
      ],
      streak: {
        current: 0,
        best: 0,
        lastActivityDate: null,
      },
      games: {
        played: 0,
        completed: 0,
        wins: 0,
        perfectRuns: 0,
        totalPlayTimeSeconds: 0,
        lastPlayedAt: null,
      },
      badges: [],
      rewards: [],
      stats: {
        quizzesCompleted: 0,
        simulationsCompleted: 0,
        trailsCompleted: 0,
        supportMaterialsViewed: 0,
      },
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.runTransaction(async (transaction) => {
      const usernameCheck = await transaction.get(usernameRef);
      if (usernameCheck.exists) throw new Error("Username já existe.");
      const emailCheck = await transaction.get(emailRef);
      if (emailCheck.exists) throw new Error("Email já está em uso.");
      transaction.set(userRef, userData);
      transaction.set(userProgressRef, userProgressData);
      transaction.set(usernameRef, { uid: createdAuthUid });
      transaction.set(emailRef, { uid: createdAuthUid });
    });
    await auth.setCustomUserClaims(createdAuthUid, {
      role: role || "usuario",
    });
    return res.status(201).json({
      message: "Usuário criado com sucesso!",
      uid: createdAuthUid,
    });
  } catch (error: any) {
    console.error(error);
    if (createdAuthUid) {
      try {
        await auth.deleteUser(createdAuthUid);
      } catch (rollbackError) {
        console.error("Erro ao desfazer usuário no Auth:", rollbackError);
      }
    }
    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({
        error: error instanceof Error ? error.message : String(error),
        message: "Email já está em uso.",
      });
    }
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: error.message || "Erro ao criar usuário.",
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const cursor = req.query.cursor as string | undefined;
    let query = db.collection("users").orderBy("name").limit(limit);
    if (cursor) {
      const lastDoc = await db.collection("users").doc(cursor).get();
      query = query.startAfter(lastDoc);
    }
    const snapshot = await query.get();
    const users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const user = {
          id: doc.id,
          ...(doc.data() as IUser),
        };

        try {
          const authUser = await auth.getUser(doc.id);

          return {
            ...user,
            lastAccessAt: authUser.metadata.lastSignInTime ?? null,
          };
        } catch {
          return {
            ...user,
            lastAccessAt: null,
          };
        }
      }),
    );
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const totalSnapshot = await db.collection("users").count().get();
    return res.json({
      data: users,
      nextCursor: lastVisible?.id ?? null,
      count: totalSnapshot.data().count,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao buscar usuários",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return;
    const uid = req.user.uid;
    const docRef = db.collection("users").doc(uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Usuário não encontrado",
      });
    }
    return res.status(200).json({
      id: docSnap.id,
      ...(docSnap.data() as IUser),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erro ao buscar usuário",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const userUpdate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const docRef = db.collection("users").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Usuário não encontrado",
      });
    }
    const oldData = docSnap.data() as IUser;
    const updates: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (name) updates.name = name;
    if (role !== undefined) {
      if (!["administrador", "usuario"].includes(role)) {
        return res.status(400).json({ message: "Perfil de acesso inválido." });
      }
      updates.role = role;
    }
    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (normalizedEmail !== oldData.email) {
        const newEmailRef = db.collection("emails").doc(normalizedEmail);
        const oldEmailRef = db.collection("emails").doc(oldData.email);
        const newEmailDoc = await newEmailRef.get();
        if (newEmailDoc.exists) {
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Email já está em uso.",
          });
        }
        await auth.updateUser(id, { email: normalizedEmail });
        await db.runTransaction(async (transaction) => {
          transaction.update(docRef, {
            email: normalizedEmail,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          transaction.set(newEmailRef, { uid: id });
          transaction.delete(oldEmailRef);
        });
      }
    }
    const hasOtherUpdates = Object.keys(updates).length > 1;
    if (hasOtherUpdates) await docRef.update(updates);
    await docRef.update(updates);
    if (name) {
      await auth.updateUser(id, { displayName: name });
    }
    if (role) {
      await auth.setCustomUserClaims(id, { role });
    }
    const updatedDoc = await docRef.get();
    return res.status(200).json({
      message: "Usuário atualizado com sucesso",
      user: {
        id: updatedDoc.id,
        ...(updatedDoc.data() as IUser),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao atualizar usuário",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deleteUserByAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { id } = req.params;
    if (!req.user?.uid) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }
    if (req.user.uid === id) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message:
          "Um administrador não pode excluir a própria conta por esta rota.",
      });
    }
    const userRef = db.collection("users").doc(id);
    const progressRef = db.collection("user_progress").doc(id);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Usuário não encontrado.",
      });
    }
    const userData = userSnap.data() as IUser;
    await db.runTransaction(async (transaction) => {
      transaction.delete(userRef);
      transaction.delete(progressRef);
      if (userData.username) {
        transaction.delete(db.collection("usernames").doc(userData.username));
      }
      if (userData.email) {
        transaction.delete(db.collection("emails").doc(userData.email));
      }
    });
    await auth.deleteUser(id);
    return res.status(200).json({
      message: "Usuário deletado com sucesso por administrador.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Erro ao deletar usuário.",
    });
  }
};
