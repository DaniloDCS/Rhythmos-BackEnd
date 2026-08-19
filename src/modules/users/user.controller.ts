import { Request, Response } from "express";
import admin from "firebase-admin";
import { db, auth } from "../../config/firebase";
import { IUser } from "./user.model";
import { normalizeUsername } from "../../utils/helpers";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { syncUserBadges } from "../badges/badge-award.service";
import { getCurrentPrivacyPolicy } from "../privacy/privacy-policy.service";
import { emitRealtimeNotification } from "../../realtime/socket";
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

const getDashboardDateString = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const getPreviousDashboardDateString = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split("T")[0];
};

const normalizeActivityDate = (value: unknown): string | null => {
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return getDashboardDateString(value);
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return getDashboardDateString(
      (value as { toDate: () => Date }).toDate(),
    );
  }
  return null;
};

const getRegistrationSettings = async () => {
  const snapshot = await db.collection("platform_settings").doc("registration").get();
  const data = snapshot.data();
  const reopenAtValue = data?.reopenAt;
  const reopenAt = reopenAtValue?.toDate?.() instanceof Date
    ? reopenAtValue.toDate().toISOString()
    : typeof reopenAtValue === "string" ? reopenAtValue : null;
  return {
    allowNewRegistrations: snapshot.exists
      ? data?.allowNewRegistrations !== false
      : true,
    closedMessage: String(data?.closedMessage ?? "A administração ainda não liberou a criação de novas contas."),
    reopenAt,
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? null,
  };
};

export const getRegistrationStatus = async (_req: Request, res: Response) => {
  try {
    return res.json(await getRegistrationSettings());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Não foi possível consultar a disponibilidade das inscrições." });
  }
};

export const updateRegistrationStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedRegistrationState = req.body?.allowNewRegistrations;
    if (requestedRegistrationState !== undefined && typeof requestedRegistrationState !== "boolean") {
      return res.status(400).json({ message: "Informe um estado válido para as inscrições." });
    }
    const currentSettings = await getRegistrationSettings();
    const allowNewRegistrations = typeof requestedRegistrationState === "boolean"
      ? requestedRegistrationState
      : currentSettings.allowNewRegistrations;
    const closedMessage = String(req.body?.closedMessage ?? currentSettings.closedMessage).trim();
    if (closedMessage.length > 240) {
      return res.status(400).json({ message: "A mensagem pode ter no máximo 240 caracteres." });
    }
    const reopenAtInput = req.body?.reopenAt === undefined ? currentSettings.reopenAt ?? "" : req.body.reopenAt ? String(req.body.reopenAt) : "";
    const reopenAtDate = reopenAtInput ? new Date(reopenAtInput) : null;
    if (reopenAtDate && Number.isNaN(reopenAtDate.getTime())) {
      return res.status(400).json({ message: "Informe uma data válida para a reabertura." });
    }
    await db.collection("platform_settings").doc("registration").set({
      allowNewRegistrations,
      closedMessage: closedMessage || "A administração ainda não liberou a criação de novas contas.",
      reopenAt: reopenAtDate ? admin.firestore.Timestamp.fromDate(reopenAtDate) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user?.uid ?? null,
    }, { merge: true });
    return res.json(await getRegistrationSettings());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Não foi possível atualizar as inscrições." });
  }
};

export const createUser = async (req: Request, res: Response) => {
  let createdAuthUid: string | null = null;
  try {
    const registrationSettings = await getRegistrationSettings();
    if (!registrationSettings.allowNewRegistrations) {
      const attemptedEmail = String(req.body?.email ?? "").trim().toLowerCase();
      const attempt = {
        email: attemptedEmail ? maskEmail(attemptedEmail) : "não informado",
        ip: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("registration_attempts").add(attempt).catch((caught) => console.error("[registration] falha ao registrar tentativa", caught));
      emitRealtimeNotification("administrators", {
        title: "Tentativa de inscrição bloqueada",
        message: `${attempt.email} tentou criar uma conta enquanto as inscrições estavam pausadas.`,
        type: "warning",
      });
      return res.status(403).json({
        error: "REGISTRATION_CLOSED",
        message: registrationSettings.closedMessage,
        reopenAt: registrationSettings.reopenAt,
      });
    }
    const { username, name, email, password, biography, role, termsAccepted, policyVersion } = req.body;
    if (!username || !name || !email || !password) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Nome, username, email e senha são obrigatórios.",
      });
    }
    if (termsAccepted !== true) {
      return res.status(400).json({
        error: "TERMS_NOT_ACCEPTED",
        message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
      });
    }
    const currentPolicy = await getCurrentPrivacyPolicy();
    if (policyVersion && policyVersion !== currentPolicy.version) return res.status(409).json({ message: "Os termos foram atualizados. Recarregue a página e leia a versão atual." });
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
    const privacyConsentRef = db.collection("privacy_consents").doc(createdAuthUid);
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
      transaction.set(privacyConsentRef, {
        userId: createdAuthUid,
        policyVersion: currentPolicy.version,
        accepted: true,
        acceptedAt: now,
        source: "signup",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? "",
      });
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

export const resolveLoginIdentifier = async (req: Request, res: Response) => {
  try {
    const identifier = String(req.body?.identifier ?? "").trim();

    if (!identifier) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Informe seu e-mail ou nome de usuário.",
      });
    }

    // O Firebase autentica com e-mail. Quando o usuário informa seu @,
    // resolvemos apenas o identificador da conta; a senha continua sendo
    // validada exclusivamente pelo Firebase Authentication.
    if (identifier.includes("@") && !identifier.startsWith("@")) {
      return res.status(200).json({ email: identifier.toLowerCase() });
    }

    const normalizedUsername = normalizeUsername(identifier);
    const usernameDoc = await db
      .collection("usernames")
      .doc(normalizedUsername)
      .get();
    const uid = usernameDoc.data()?.uid;

    if (!usernameDoc.exists || typeof uid !== "string") {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "E-mail, usuário ou senha inválidos.",
      });
    }

    const userRecord = await auth.getUser(uid);
    if (!userRecord.email) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "E-mail, usuário ou senha inválidos.",
      });
    }

    return res.status(200).json({ email: userRecord.email.toLowerCase() });
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
      message: "E-mail, usuário ou senha inválidos.",
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
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Usuário não encontrado",
      });
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
    return res.status(500).json({
      message: "Erro ao buscar usuário",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
export const getUserProgress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const docRef = db.collection("user_progress").doc(userId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Usuário não encontrado",
      });
    }
    return res.status(200).json({
      id: docSnap.id,
      ...docSnap.data(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao buscar usuário",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
export const userUpdate = async (req: Request, res: Response) => {
  try {
    const { id, name, email, biography, theme, location } = req.body;
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
export const updateOwnUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Usuário não autenticado." });
    const id = req.user.uid;
    const { name, biography, theme, location } = req.body ?? {};
    const docRef = db.collection("users").doc(id);
    if (!(await docRef.get()).exists) return res.status(404).json({ message: "Usuário não encontrado." });
    const updates: Record<string, unknown> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (typeof name === "string" && name.trim()) updates.name = name.trim().slice(0, 160);
    if (typeof biography === "string") updates.biography = biography.trim().slice(0, 1000);
    if (typeof location === "string") updates.location = location.trim().slice(0, 120);
    const allowedThemes = ["theme-ebserh", "theme-navy", "theme-ocean", "theme-electric", "theme-emerald", "theme-danger", "theme-slate", "theme-moss", "theme-amber", "theme-slateblue", "theme-purple"];
    if (typeof theme === "string") {
      if (!allowedThemes.includes(theme)) return res.status(400).json({ message: "Tema inválido." });
      updates.theme = theme;
    }
    await docRef.update(updates);
    if (updates.name) await auth.updateUser(id, { displayName: String(updates.name) });
    const updated = await docRef.get();
    return res.json({ message: "Perfil atualizado com sucesso.", user: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar perfil.", error: error instanceof Error ? error.message : String(error) });
  }
};
export const addProfileView = async (req: Request, res: Response) => {
  try {
    const { profileId, viewerId } = req.body;
    if (!profileId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
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
        error: "NOT_FOUND",
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
      error: error instanceof Error ? error.message : String(error),
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
export const getDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Usuário não autenticado.",
      });
    }
    const userId = req.user.uid;
    const userRef = db.collection("users").doc(userId);
    const progressRef = db.collection("user_progress").doc(userId);
    const [userSnap, progressSnap, enrollmentsSnap, announcementsSnap] = await Promise.all([
      userRef.get(),
      progressRef.get(),
      db.collection("enrollments").where("userId", "==", userId).get(),
      db.collection("announcements").get(),
    ]);
    if (!userSnap.exists) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Usuário não encontrado.",
      });
    }
    const user = {
      id: userSnap.id,
      ...userSnap.data(),
    };
    const now = Date.now();
    const userRole = String((user as any).role ?? "").toLowerCase();
    const announcements = announcementsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((item) => {
        if (item.status !== "published") return false;
        const audienceMatches = item.audience === "all" ||
          (item.audience === "administrators" && userRole === "administrador") ||
          (item.audience === "students" && userRole !== "administrador");
        const startsAt = item.startsAt?.toMillis?.() ?? 0;
        const endsAt = item.endsAt?.toMillis?.() ?? Number.POSITIVE_INFINITY;
        return audienceMatches && startsAt <= now && endsAt >= now;
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    let progress = progressSnap.exists
      ? {
          id: progressSnap.id,
          ...progressSnap.data(),
        }
      : null;
    let newlyUnlockedBadges: Array<{
      badgeId: string;
      name: string;
      unlockedAt?: string | null;
    }> = [];
    let badgeCatalog: Awaited<ReturnType<typeof syncUserBadges>>["catalog"] = [];
    if (progress) {
      const badgeResult = await syncUserBadges(userId);
      progress = { id: userId, ...badgeResult.progress };
      newlyUnlockedBadges = badgeResult.newlyUnlocked;
      badgeCatalog = badgeResult.catalog;
    }
    let streakNotice: string | undefined;
    if (progress) {
      const streak = (progress as any).streak;
      const currentStreak = Number(streak?.current ?? 0);
      const lastActivityDate = normalizeActivityDate(streak?.lastActivityDate);
      const today = getDashboardDateString();
      const yesterday = getPreviousDashboardDateString(today);
      const streakExpired =
        currentStreak > 0 &&
        (!lastActivityDate ||
          (lastActivityDate !== today && lastActivityDate !== yesterday));

      if (streakExpired) {
        (progress as any).streak = {
          ...streak,
          current: 0,
        };
        streakNotice = `Sua sequência de ${currentStreak} ${
          currentStreak === 1 ? "dia foi encerrada" : "dias foi encerrada"
        } porque não houve atividade nos últimos dias. Conclua uma atividade hoje para iniciar uma nova sequência.`;
        await progressRef.update({
          "streak.current": 0,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    }
    const rawEnrollments = enrollmentsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
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
        const versionId =
          lessonData?.publishedVersionId ?? lessonData?.currentVersionId;
        const versionSnap = versionId
          ? await lessonSnap.ref.collection("versions").doc(versionId).get()
          : null;
        const versionData = versionSnap?.exists ? versionSnap.data() : null;

        currentLesson = {
          id: lessonSnap.id,
          title:
            versionData?.title ??
            lessonData?.title ??
            `Aula ${Number(lessonData?.sequence ?? 1)}`,
          sequence: lessonData?.sequence,
          type: versionData?.type ?? lessonData?.type,
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
      streakNotice,
      newlyUnlockedBadges,
      badgeCatalog,
      announcements,
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Erro ao carregar dashboard.",
    });
  }
};
