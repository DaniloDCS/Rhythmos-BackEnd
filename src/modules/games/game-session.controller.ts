import type { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { userGamificationRef } from "../gamification/user-gamification.repository";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { GamificationService } from "../gamification/gamification.service";

interface GameValidationPolicy {
  sessionTtlSeconds: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  expectedAnswers?: number | null;
  minimumCorrectAnswers?: number | null;
  minimumWinningScore?: number | null;
  maximumScore?: number | null;
  perfectCorrectAnswers?: number | null;
}

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const startGameSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Usuário não autenticado." });
    const game = await db.collection("games").doc(req.params.id).get();
    if (!game.exists || game.data()?.status !== "disponivel") {
      return res.status(404).json({ message: "Jogo não encontrado." });
    }
    const policy = game.data()?.validation as GameValidationPolicy | undefined;
    if (!policy) return res.status(503).json({ message: "Jogo ainda não possui política de validação configurada." });
    const progress = await userGamificationRef(req.user.uid).get();
    const profile = await db.collection("users").doc(req.user.uid).get();
    const isAdmin = ["admin", "administrador"].includes(String(profile.data()?.role ?? "").toLowerCase());
    if (!isAdmin && !progress.data()?.unlocked?.games?.[game.id]) {
      return res.status(403).json({ message: "Jogo bloqueado." });
    }
    const ref = db.collection("game_sessions").doc();
    const now = Timestamp.now();
    const ttl = Math.max(60, Number(policy.sessionTtlSeconds));
    const expiresAt = Timestamp.fromMillis(now.toMillis() + ttl * 1000);
    await ref.set({
      userId: req.user.uid,
      gameId: game.id,
      gameVersion: Number(game.data()?.version ?? 1),
      status: "started",
      startedAt: now,
      expiresAt,
      createdAt: now,
    });
    return res.status(201).json({ gameSessionId: ref.id, startedAt: now, expiresAt });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao iniciar partida.", error: error instanceof Error ? error.message : String(error) });
  }
};

export const completeGameSession = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user?.uid) return res.status(401).json({ message: "Usuário não autenticado." });
    const sessionId = String(req.params.sessionId ?? req.body?.gameSessionId ?? "").trim();
    if (!sessionId) return res.status(400).json({ message: "gameSessionId é obrigatório." });
    const sessionRef = db.collection("game_sessions").doc(sessionId);
    const gameRef = db.collection("games").doc(req.params.id);
    const [sessionSnapshot, gameSnapshot] = await Promise.all([sessionRef.get(), gameRef.get()]);
    if (!sessionSnapshot.exists || !gameSnapshot.exists) return res.status(404).json({ message: "Partida ou jogo não encontrado." });
    const session = sessionSnapshot.data()!;
    if (session.userId !== req.user.uid || session.gameId !== req.params.id) return res.status(403).json({ message: "Partida não pertence ao usuário/jogo." });
    if (session.status !== "started") return res.status(409).json({ message: "Partida já concluída ou inválida." });
    const now = Timestamp.now();
    if (session.expiresAt?.toMillis?.() < now.toMillis()) return res.status(410).json({ message: "Partida expirada." });
    const policy = gameSnapshot.data()?.validation as GameValidationPolicy | undefined;
    if (!policy) return res.status(503).json({ message: "Política de validação ausente." });
    const score = number(req.body?.score);
    const correctAnswers = number(req.body?.correctAnswers ?? 0);
    const totalAnswers = number(req.body?.totalAnswers ?? policy.expectedAnswers ?? 0);
    const timeSeconds = number(req.body?.timeSeconds);
    if (![score, correctAnswers, totalAnswers, timeSeconds].every(Number.isFinite)) {
      return res.status(400).json({ message: "Evidências numéricas da partida são obrigatórias." });
    }
    const serverElapsed = Math.max(0, Math.floor((now.toMillis() - session.startedAt.toMillis()) / 1000));
    if (timeSeconds < 0 || timeSeconds > policy.maxDurationSeconds || serverElapsed < policy.minDurationSeconds) {
      return res.status(422).json({ message: "Tempo de partida incompatível com a política do jogo." });
    }
    if (score < 0 || (policy.maximumScore != null && score > policy.maximumScore)) {
      return res.status(422).json({ message: "Score fora da faixa permitida." });
    }
    if (correctAnswers < 0 || totalAnswers < 0 || correctAnswers > totalAnswers) {
      return res.status(422).json({ message: "Contagem de respostas inválida." });
    }
    if (policy.expectedAnswers != null && totalAnswers !== policy.expectedAnswers) {
      return res.status(422).json({ message: "Quantidade de respostas incompatível com o jogo." });
    }
    const wonByAnswers = policy.minimumCorrectAnswers != null && correctAnswers >= policy.minimumCorrectAnswers;
    const wonByScore = policy.minimumWinningScore != null && score >= policy.minimumWinningScore;
    const won = Boolean(wonByAnswers || wonByScore);
    const perfect = won && policy.perfectCorrectAnswers != null && correctAnswers >= policy.perfectCorrectAnswers;
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(sessionRef);
      if (!current.exists || current.data()?.status !== "started") throw new Error("SESSION_ALREADY_COMPLETED");
      transaction.update(sessionRef, { status: "completed", completedAt: now, validatedResult: { won, perfect, score, correctAnswers, totalAnswers, timeSeconds } });
    });
    const baseResult = await GamificationService.awardEvent({
      userId: req.user.uid,
      event: "game_completed",
      sourceId: req.params.id,
      idempotencyKey: `game_${sessionId}`,
      baseXp: won ? Number(gameSnapshot.data()?.xpReward ?? 0) : 0,
      metadata: { sessionId, won, perfect, score, correctAnswers, totalAnswers, timeSeconds },
    });
    const perfectResult = perfect
      ? await GamificationService.awardEvent({
          userId: req.user.uid,
          event: "game_perfect",
          sourceId: req.params.id,
          idempotencyKey: `game_perfect_${sessionId}`,
          metadata: { sessionId },
        })
      : null;
    const totalAdded = baseResult.xp.added + (perfectResult?.xp.added ?? 0);
    const historyRef = db.collection("game_history").doc(sessionId);
    await historyRef.set({
      id: historyRef.id, userId: req.user.uid, gameId: req.params.id,
      gameName: gameSnapshot.data()?.name, score, timeSeconds, correctAnswers,
      totalAnswers, won, perfectRun: perfect, completed: true,
      xpAwarded: totalAdded,
      xpBreakdown: { base: baseResult.xp, perfect: perfectResult?.xp ?? null },
      gameSessionId: sessionId, completedAt: now, createdAt: now,
    });
    return res.json({
      message: won ? "Jogo concluído com sucesso." : "Partida registrada sem recompensa de vitória.",
      game: { id: req.params.id, name: gameSnapshot.data()?.name },
      result: { score, timeSeconds, correctAnswers, totalAnswers, perfectRun: perfect, won },
      xp: { ...baseResult.xp, bonuses: perfectResult ? [{ key: "game_perfect", xp: perfectResult.xp.added }] : [], added: totalAdded, current: perfectResult?.xp.current ?? baseResult.xp.current },
      levelUp: baseResult.levelUp || Boolean(perfectResult?.levelUp),
      level: {
        previous: baseResult.progress.level.current - (baseResult.levelUp ? 1 : 0),
        current: perfectResult?.progress.level.current ?? baseResult.progress.level.current,
        title: perfectResult?.progress.level.currentTitle ?? baseResult.progress.level.currentTitle,
        progressPercent: perfectResult?.progress.level.progressPercent ?? baseResult.progress.level.progressPercent,
      },
      rewards: [...baseResult.rewards, ...(perfectResult?.rewards ?? [])],
      newlyUnlockedBadges: [...baseResult.newlyUnlockedBadges, ...(perfectResult?.newlyUnlockedBadges ?? [])],
      progress: perfectResult?.progress ?? baseResult.progress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(message === "SESSION_ALREADY_COMPLETED" ? 409 : 500).json({ message: "Erro ao concluir partida.", error: message });
  }
};
