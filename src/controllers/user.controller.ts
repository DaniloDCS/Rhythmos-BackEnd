import { Request, Response } from "express";
import admin from "firebase-admin";
import { db, auth } from "../config/firebase";
import { IUser } from "../models/User";
import { normalizeUsername } from "../utils/helpers";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");

  if (!user || !domain) return email;

  const visibleChars = 2;

  const maskedUser =
    user.length <= visibleChars
      ? "*".repeat(user.length)
      : user.slice(0, visibleChars) + "*".repeat(user.length - visibleChars);

  return `${maskedUser}@${domain}`;
}

export const createUser = async (req: Request, res: Response) => {
  let createdAuthUid: string | null = null;

  try {
    const { username, name, email, password, biography, role } = req.body;

    if (!username || !name || !email || !password) {
      return res.status(400).json({
        message: "Nome, username, email e senha são obrigatórios.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "A senha deve ter pelo menos 6 caracteres.",
      });
    }

    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = String(email).trim().toLowerCase();

    // 🔎 Referências
    const usernameRef = db.collection("usernames").doc(normalizedUsername);
    const emailRef = db.collection("emails").doc(normalizedEmail);

    const usernameDoc = await usernameRef.get();
    if (usernameDoc.exists) {
      return res.status(400).json({ message: "Username já existe." });
    }

    const emailDoc = await emailRef.get();
    if (emailDoc.exists) {
      return res.status(400).json({ message: "Email já está em uso." });
    }

    // 🔐 1. CRIA NO AUTH
    const userRecord = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: name,
    });

    createdAuthUid = userRecord.uid;

    const userRef = db.collection("users").doc(createdAuthUid);
    const userProgressRef = db.collection("user_progress").doc(createdAuthUid);

    const now = admin.firestore.FieldValue.serverTimestamp();

    // 👤 USER
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

    // 📊 PROGRESSO
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

      // ⚠️ NÃO usar serverTimestamp em array
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

    // 🔥 2. TRANSACTION (tudo ou nada)
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

    // 🎯 3. CLAIMS (depois que deu certo)
    await auth.setCustomUserClaims(createdAuthUid, {
      role: role || "usuario",
    });

    return res.status(201).json({
      message: "Usuário criado com sucesso!",
      uid: createdAuthUid,
    });
  } catch (error: any) {
    console.error(error);

    // 🔥 ROLLBACK DO AUTH
    if (createdAuthUid) {
      try {
        await auth.deleteUser(createdAuthUid);
      } catch (rollbackError) {
        console.error("Erro ao desfazer usuário no Auth:", rollbackError);
      }
    }

    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ message: "Email já está em uso." });
    }

    return res.status(500).json({
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

    const users: IUser[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as IUser),
    }));

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    // Total geral de usuários
    const totalSnapshot = await db.collection("users").count().get();

    return res.json({
      data: users,

      nextCursor: lastVisible?.id ?? null,

      count: totalSnapshot.data().count,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar usuários",
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
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.status(200).json({
      id: docSnap.id,
      ...(docSnap.data() as IUser),
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar usuário" });
  }
};

export const getBasicUser = async (req: Request, res: Response) => {
  try {
    const { info } = req.params;

    let snapshot;

    if (info.includes("@") && info.includes(".")) {
      snapshot = await db
        .collection("users")
        .where("email", "==", info)
        .limit(1)
        .get();
    } else if (info.startsWith("@")) {
      const username = info.startsWith("@") ? info : `@${info}`;

      snapshot = await db
        .collection("users")
        .where("username", "==", username)
        .limit(1)
        .get();
    } else {
      snapshot = await db
        .collection("users")
        .where("id", "==", info)
        .limit(1)
        .get();
    }

    if (snapshot.empty) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as IUser;

    return res.status(200).json({
      id: doc.id,
      name: data.name,
      username: data.username,
      email: maskEmail(data.email),
      role: data.role,
      theme: data.theme,
      biography: data.biography,
      location: data.location,
      createdAt: data.createdAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar usuário" });
  }
};

export const getUserProgress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const docRef = db.collection("user_progress").doc(userId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.status(200).json({
      id: docSnap.id,
      ...docSnap.data(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar usuário" });
  }
};

export const userUpdate = async (req: Request, res: Response) => {
  try {
    const { id, name, email, biography, theme, location } = req.body;

    const docRef = db.collection("users").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const oldData = docSnap.data() as IUser;
    const updates: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name) updates.name = name;
    if (biography) updates.biography = biography;
    if (theme) updates.theme = theme;
    if (location) updates.location = location;

    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();

      if (normalizedEmail !== oldData.email) {
        const newEmailRef = db.collection("emails").doc(normalizedEmail);
        const oldEmailRef = db.collection("emails").doc(oldData.email);

        const newEmailDoc = await newEmailRef.get();
        if (newEmailDoc.exists) {
          return res.status(400).json({ message: "Email já está em uso." });
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
    return res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
};

export const addProfileView = async (req: Request, res: Response) => {
  try {
    const { profileId, viewerId, sharedBy } = req.body;

    if (!profileId) {
      return res.status(400).json({
        message: "profileId é obrigatório.",
      });
    }

    if (viewerId && viewerId === profileId) {
      return res.status(200).json({
        message: "Visualização própria não contabilizada.",
      });
    }

    const profileRef = db.collection("users").doc(profileId);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return res.status(404).json({
        message: "Perfil não encontrado.",
      });
    }

    await profileRef.update({
      visits: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: "Visualização registrada com sucesso.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao registrar visualização.",
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
        message: "Usuário não autenticado.",
      });
    }

    if (req.user.uid === id) {
      return res.status(400).json({
        message:
          "Um administrador não pode excluir a própria conta por esta rota.",
      });
    }

    const userRef = db.collection("users").doc(id);
    const progressRef = db.collection("user_progress").doc(id);

    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({
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
      message: "Erro ao deletar usuário.",
    });
  }
};

export const getDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    /*
     * =========================================================
     * 1. BUSCA USUÁRIO + PROGRESSO + MATRÍCULAS EM PARALELO
     * =========================================================
     */

    const userRef = db.collection("users").doc(userId);
    const progressRef = db.collection("user_progress").doc(userId);

    const [userSnap, progressSnap, enrollmentsSnap] = await Promise.all([
      userRef.get(),

      progressRef.get(),

      db.collection("enrollments").where("userId", "==", userId).get(),
    ]);

    if (!userSnap.exists) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    const user = {
      id: userSnap.id,
      ...userSnap.data(),
    };

    const progress = progressSnap.exists
      ? {
          id: progressSnap.id,
          ...progressSnap.data(),
        }
      : null;

    /*
     * =========================================================
     * 2. MATRÍCULAS
     * =========================================================
     */

    const rawEnrollments = enrollmentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    /*
     * =========================================================
     * 3. BUSCA AS TRILHAS DAS MATRÍCULAS
     *
     * Evitamos fazer .get() repetido caso existam matrículas
     * duplicadas ou algum trailId apareça mais de uma vez.
     * =========================================================
     */

    const trailIds = [
      ...new Set(
        rawEnrollments.map((enrollment) => enrollment.trailId).filter(Boolean),
      ),
    ] as string[];

    const trailDocs = await Promise.all(
      trailIds.map((trailId) => db.collection("trails").doc(trailId).get()),
    );

    const trailsMap = new Map<string, any>();

    trailDocs.forEach((trailDoc) => {
      if (!trailDoc.exists) return;

      trailsMap.set(trailDoc.id, {
        id: trailDoc.id,
        ...trailDoc.data(),
      });
    });

    /*
     * =========================================================
     * 4. NORMALIZA MATRÍCULAS
     * =========================================================
     */

    const enrollments = rawEnrollments.map((enrollment) => {
      const trail = trailsMap.get(enrollment.trailId);

      return {
        id: enrollment.id,

        trail: trail
          ? {
              id: trail.id,
              title: trail.title,
              slug: trail.slug,
              description: trail.description,
              thumbnailUrl: trail.thumbnailUrl,
              level: trail.level,
              category: trail.category,
              totalLessons: trail.totalLessons ?? 0,
              totalModules: trail.totalModules ?? 0,
              estimatedMinutes: trail.estimatedMinutes,
              workloadHours: trail.workloadHours,
            }
          : null,

        status: enrollment.status,

        progress: enrollment.progress ?? 0,

        completedLessons:
          enrollment.completedLessons?.length ??
          Object.keys(enrollment.completedLessonsMap ?? {}).length,

        completedModules:
          enrollment.completedModules?.length ??
          Object.keys(enrollment.completedModulesMap ?? {}).length,

        currentLessonId: enrollment.currentLessonId ?? null,
        currentModuleId: enrollment.currentModuleId ?? null,

        xp: enrollment.xp ?? 0,

        startedAt: enrollment.startedAt ?? null,
        lastAccessAt: enrollment.lastAccessAt ?? null,
        completedAt: enrollment.completedAt ?? null,
      };
    });

    /*
     * =========================================================
     * 5. RESUMO DAS MATRÍCULAS
     * =========================================================
     */

    const activeEnrollments = enrollments.filter(
      (enrollment) => enrollment.status === "matriculado",
    );

    const completedEnrollments = enrollments.filter(
      (enrollment) => enrollment.status === "concluido",
    );

    const cancelledEnrollments = enrollments.filter(
      (enrollment) => enrollment.status === "cancelado",
    );

    const averageProgress =
      activeEnrollments.length > 0
        ? Math.round(
            activeEnrollments.reduce(
              (total, enrollment) => total + Number(enrollment.progress ?? 0),
              0,
            ) / activeEnrollments.length,
          )
        : 0;

    /*
     * =========================================================
     * 6. DESCOBRE A TRILHA MAIS RECENTE
     * =========================================================
     */

    const getTimestamp = (value: any): number => {
      if (!value) return 0;

      if (typeof value.toMillis === "function") {
        return value.toMillis();
      }

      if (value._seconds) {
        return value._seconds * 1000;
      }

      if (value.seconds) {
        return value.seconds * 1000;
      }

      if (value instanceof Date) {
        return value.getTime();
      }

      return 0;
    };

    const continueEnrollment = [...activeEnrollments].sort(
      (a, b) => getTimestamp(b.lastAccessAt) - getTimestamp(a.lastAccessAt),
    )[0];

    /*
     * =========================================================
     * 7. BUSCA MÓDULO E AULA ATUAL DA MATRÍCULA MAIS RECENTE
     * =========================================================
     */

    let continueLearning = null;

    if (continueEnrollment?.trail) {
      let currentModule = null;
      let currentLesson = null;

      const requests: Promise<any>[] = [];

      if (continueEnrollment.currentModuleId) {
        requests.push(
          db
            .collection("modules")
            .doc(continueEnrollment.currentModuleId)
            .get(),
        );
      } else {
        requests.push(Promise.resolve(null));
      }

      if (continueEnrollment.currentLessonId) {
        requests.push(
          db
            .collection("lessons")
            .doc(continueEnrollment.currentLessonId)
            .get(),
        );
      } else {
        requests.push(Promise.resolve(null));
      }

      const [moduleSnap, lessonSnap] = await Promise.all(requests);

      if (moduleSnap?.exists) {
        const moduleData = moduleSnap.data();

        currentModule = {
          id: moduleSnap.id,
          title: moduleData?.title,
          sequence: moduleData?.sequence,
        };
      }

      if (lessonSnap?.exists) {
        const lessonData = lessonSnap.data();

        currentLesson = {
          id: lessonSnap.id,
          title: lessonData?.title,
          sequence: lessonData?.sequence,
          type: lessonData?.type,
        };
      }

      continueLearning = {
        enrollmentId: continueEnrollment.id,

        trail: continueEnrollment.trail,

        progress: continueEnrollment.progress,

        completedLessons: continueEnrollment.completedLessons,

        currentModule,
        currentLesson,

        lastAccessAt: continueEnrollment.lastAccessAt,
      };
    }

    /*
     * =========================================================
     * 8. RETORNO DA DASHBOARD
     * =========================================================
     */

    return res.status(200).json({
      user,

      progress,

      summary: {
        enrolledTrails: enrollments.length,

        inProgressTrails: activeEnrollments.length,

        completedTrails: completedEnrollments.length,

        cancelledTrails: cancelledEnrollments.length,

        averageProgress,
      },

      continueLearning,

      enrollments,
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error);

    return res.status(500).json({
      message: "Erro ao carregar dashboard.",
    });
  }
};
