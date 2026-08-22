import type { Request, Response } from "express";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { calculateRankingScore, getGamificationSettings } from "./gamification-settings.service";
import type { GamificationSettings } from "./gamification.types";
import { GamificationService } from "./gamification.service";
import { allUserGamificationQuery, userGamificationRef } from "./user-gamification.repository";
import { syncRankingProfile } from "./ranking-profile.service";

const asFinite = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const validateSettings = (body: GamificationSettings) => {
  if (!body.timezone?.trim()) throw new Error("Timezone é obrigatório.");
  const anti = body.antiFarming;
  if (!anti || !Array.isArray(anti.multipliers) || !anti.multipliers.length) {
    throw new Error("A política anti-farming precisa de multiplicadores.");
  }
  if (anti.multipliers.some((item) => !Number.isFinite(Number(item)) || Number(item) < 0)) {
    throw new Error("Multiplicadores inválidos.");
  }
  if (!body.ranking) throw new Error("Configuração de ranking é obrigatória.");
  return body;
};

export const getSettingsAdmin = async (_req: Request, res: Response) => {
  try { return res.json(await getGamificationSettings()); }
  catch (error) { return res.status(500).json({ message: "Erro ao buscar configurações.", error: error instanceof Error ? error.message : String(error) }); }
};

export const recalculateRanking = async () => {
  const settings = await getGamificationSettings();

  let updated = 0;
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  do {
    let query: FirebaseFirestore.Query = allUserGamificationQuery()
      .orderBy(FieldPath.documentId())
      .limit(400);

    if (last) {
      query = query.startAfter(last);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    const now = Timestamp.now();

    snapshot.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          ranking: {
            score: calculateRankingScore(doc.data(), settings.ranking),
            updatedAt: now,
          },
        },
        { merge: true },
      );
    });

    await batch.commit();

    await Promise.all(
      snapshot.docs.map((doc) => {
        const userId = String(doc.data().userId ?? "");

        if (!userId) {
          return Promise.resolve();
        }

        return syncRankingProfile(userId);
      }),
    );

    updated += snapshot.size;

    last = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < 400) {
      break;
    }
  } while (last);

  return updated;
};

export const updateSettingsAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const current = await getGamificationSettings();
    const next = validateSettings({ ...current, ...req.body });
    await db.collection("gamification_settings").doc("global").set({
      ...next,
      updatedBy: req.user?.uid,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    const updated = await recalculateRanking();
    return res.json({ message: "Configurações salvas e ranking recalculado.", settings: next, recalculatedUsers: updated });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : String(error) });
  }
};

export const rewardUserAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const type = String(req.body.type ?? "");
    const reason = String(req.body.reason ?? "").trim();
    if (!reason) return res.status(400).json({ message: "Motivo é obrigatório." });
    let xp = 0;
    const rewardIds: string[] = [];
    let badgeId: string | null = null;
    if (type === "xp") {
      xp = asFinite(req.body.xp, 0);
      if (xp <= 0) return res.status(400).json({ message: "XP deve ser maior que zero." });
    } else if (type === "reward") {
      const rewardId = String(req.body.rewardId ?? "").trim();
      const reward = await db.collection("rewards").doc(rewardId).get();
      if (!reward.exists || reward.data()?.active === false) return res.status(400).json({ message: "Recompensa ativa inválida." });
      rewardIds.push(rewardId);
      if (reward.data()?.type === "xp_bonus") {
        xp = asFinite(reward.data()?.value, 0);
        if (xp <= 0) return res.status(400).json({ message: "Recompensa de XP possui valor inválido." });
      }
    } else if (type === "badge") {
      badgeId = String(req.body.badgeId ?? "").trim();
      const badge = await db.collection("badges").doc(badgeId).get();
      if (!badge.exists || badge.data()?.active === false) return res.status(400).json({ message: "Insígnia ativa inválida." });
    } else {
      return res.status(400).json({ message: "Tipo de recompensa inválido." });
    }
    const historyRef = db.collection("admin_reward_history").doc();
    const result = await GamificationService.awardEvent({
      userId: targetUserId,
      event: type === "reward" ? "xp_bonus" : "admin_reward",
      sourceId: historyRef.id,
      idempotencyKey: `admin_${historyRef.id}`,
      baseXp: xp,
      bypassAntiFarming: true,
      rewardIds,
      metadata: { adminUserId: req.user?.uid, reason, type, badgeId },
    });
    if (badgeId) {
      const [badge, progress] = await Promise.all([
        db.collection("badges").doc(badgeId).get(),
        userGamificationRef(targetUserId).get(),
      ]);
      const badges = [...(progress.data()?.badges ?? [])];
      if (!badges.some((item: { badgeId?: string }) => item.badgeId === badgeId)) {
        badges.push({ badgeId, name: badge.data()?.name ?? "Insígnia", unlockedAt: new Date().toISOString() });
        await progress.ref.set({ badges, updatedAt: Timestamp.now() }, { merge: true });
      }
    }
    await historyRef.set({
      adminUserId: req.user?.uid,
      targetUserId,
      type,
      xp: xp || null,
      badgeId,
      rewardId: rewardIds[0] ?? null,
      reason,
      createdAt: Timestamp.now(),
    });
    return res.status(201).json({ message: "Recompensa concedida.", historyId: historyRef.id, result });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao conceder recompensa.", error: error instanceof Error ? error.message : String(error) });
  }
};

export const getRewardHistoryAdmin = async (req: Request, res: Response) => {
  const snapshot = await db.collection("admin_reward_history").where("targetUserId", "==", req.params.id).get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  items.sort((a, b) => Number((b as FirebaseFirestore.DocumentData).createdAt?.toMillis?.() ?? 0) - Number((a as FirebaseFirestore.DocumentData).createdAt?.toMillis?.() ?? 0));
  return res.json(items);
};
