import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { calculateRankingScore } from "../modules/gamification/gamification-settings.service";
import type { GamificationSettings } from "../modules/gamification/gamification.types";

const settings: GamificationSettings = {
  timezone: "America/Fortaleza",
  antiFarming: {
    active: true,
    period: "daily",
    timezone: "America/Fortaleza",
    multipliers: [1, 0.5, 0.25, 0.1],
    afterLimitMultiplier: 0,
    maxRewardedCompletions: 4,
    maxXpPerPeriod: null,
    cooldownSeconds: 0,
    minimumRepeatXp: 0,
  },
  ranking: {
    active: true,
    xpWeight: 1,
    victoryWeight: 50,
    completedGameWeight: 20,
    perfectRunWeight: 100,
    streakWeight: 15,
    pageSize: 50,
  },
  streakMilestones: [
    { id: "3-days", days: 3, xp: 15, active: true, order: 1 },
    { id: "7-days", days: 7, xp: 40, active: true, order: 2 },
    { id: "14-days", days: 14, xp: 80, active: true, order: 3 },
    { id: "30-days", days: 30, xp: 150, active: true, order: 4 },
  ],
};

const ruleSeeds = [
  ["lesson_completed", "Concluir aula", "aulas", 20, false],
  ["module_completed", "Concluir módulo", "aulas", 50, false],
  ["trail_completed", "Concluir trilha", "trilhas", 150, false],
  ["quiz_completed", "Concluir quiz", "quizzes", 30, false],
  ["simulation_completed", "Concluir simulação", "simulacoes", 50, false],
  ["clinical_case_completed", "Concluir caso clínico", "simulacoes", 80, false],
  ["game_perfect", "Partida perfeita", "jogos", 20, true],
] as const;

const validationBySlug: Record<string, Record<string, number | null>> = {
  "palavras-cruzadas": {
    sessionTtlSeconds: 7200,
    minDurationSeconds: 1,
    maxDurationSeconds: 7200,
    expectedAnswers: null,
    minimumCorrectAnswers: null,
    minimumWinningScore: 1,
    maximumScore: 100000,
    perfectCorrectAnswers: null,
  },
  "jogo-dos-5-erros": {
    sessionTtlSeconds: 3600,
    minDurationSeconds: 1,
    maxDurationSeconds: 3600,
    expectedAnswers: 5,
    minimumCorrectAnswers: 5,
    minimumWinningScore: null,
    maximumScore: 40,
    perfectCorrectAnswers: 5,
  },
  "linha-do-tempo-eletrico": {
    sessionTtlSeconds: 3600,
    minDurationSeconds: 1,
    maxDurationSeconds: 3600,
    expectedAnswers: null,
    minimumCorrectAnswers: null,
    minimumWinningScore: 1,
    maximumScore: 10000,
    perfectCorrectAnswers: null,
  },
  match: {
    sessionTtlSeconds: 3600,
    minDurationSeconds: 1,
    maxDurationSeconds: 3600,
    expectedAnswers: null,
    minimumCorrectAnswers: 1,
    minimumWinningScore: 1,
    maximumScore: 10000,
    perfectCorrectAnswers: null,
  },
  "monte-o-ritmo": {
    sessionTtlSeconds: 3600,
    minDurationSeconds: 1,
    maxDurationSeconds: 3600,
    expectedAnswers: 6,
    minimumCorrectAnswers: 6,
    minimumWinningScore: null,
    maximumScore: 300,
    perfectCorrectAnswers: 6,
  },
  "diferencas-dos-ritmos": {
    sessionTtlSeconds: 3600,
    minDurationSeconds: 1,
    maxDurationSeconds: 3600,
    expectedAnswers: 5,
    minimumCorrectAnswers: 5,
    minimumWinningScore: null,
    maximumScore: 500,
    perfectCorrectAnswers: 5,
  },
  "qual-ritmo-eu-sou": {
    sessionTtlSeconds: 3600,
    minDurationSeconds: 1,
    maxDurationSeconds: 3600,
    expectedAnswers: 1,
    minimumCorrectAnswers: 1,
    minimumWinningScore: null,
    maximumScore: 100000,
    perfectCorrectAnswers: 1,
  },
  "desenhe-o-ritmo": {
    sessionTtlSeconds: 3600,
    minDurationSeconds: 1,
    maxDurationSeconds: 3600,
    expectedAnswers: 4,
    minimumCorrectAnswers: 3,
    minimumWinningScore: null,
    maximumScore: 100,
    perfectCorrectAnswers: 4,
  },
  "mestre-do-ecg": {
    sessionTtlSeconds: 7200,
    minDurationSeconds: 1,
    maxDurationSeconds: 7200,
    expectedAnswers: 10,
    minimumCorrectAnswers: 6,
    minimumWinningScore: null,
    maximumScore: 500,
    perfectCorrectAnswers: 10,
  },
};

const run = async () => {
  const report = { read: 0, created: 0, updated: 0, preserved: 0 };
  const settingsRef = db.collection("gamification_settings").doc("global");
  const currentSettings = await settingsRef.get();
  report.read++;
  if (currentSettings.exists) {
    await settingsRef.set(
      { ...settings, ...currentSettings.data(), migratedAt: Timestamp.now() },
      { merge: true },
    );
    report.updated++;
  } else {
    await settingsRef.set({
      ...settings,
      createdAt: Timestamp.now(),
      migratedAt: Timestamp.now(),
    });
    report.created++;
  }

  for (let index = 0; index < ruleSeeds.length; index++) {
    const [key, name, category, xp, repeatable] = ruleSeeds[index];
    const existing = await db
      .collection("xp_activity_rules")
      .where("key", "==", key)
      .limit(1)
      .get();
    report.read += existing.size;
    if (!existing.empty) {
      report.preserved++;
      continue;
    }
    await db.collection("xp_activity_rules").doc(key).set({
      key,
      name,
      description: name,
      category,
      xp,
      active: true,
      repeatable,
      dailyLimit: null,
      order: index,
      createdAt: Timestamp.now(),
    });
    report.created++;
  }

  const games = await db.collection("games").get();
  report.read += games.size;
  for (const game of games.docs) {
    const data = game.data();
    const validation = validationBySlug[String(data.slug ?? "")];
    const patch: Record<string, unknown> = {};
    if (
      !Number.isFinite(Number(data.xpReward)) &&
      Number.isFinite(Number(data.xpBaseReward))
    )
      patch.xpReward = Number(data.xpBaseReward);
    if (!data.validation && validation) patch.validation = validation;
    if (Object.keys(patch).length) {
      await game.ref.set(
        { ...patch, updatedAt: Timestamp.now() },
        { merge: true },
      );
      report.updated++;
    } else report.preserved++;
  }

  const histories = await db.collection("game_history").get();
  report.read += histories.size;
  const correctByUser = new Map<string, number>();
  histories.docs.forEach((doc) => {
    const data = doc.data();
    const uid = String(data.userId ?? "");
    if (uid)
      correctByUser.set(
        uid,
        (correctByUser.get(uid) ?? 0) +
          Math.max(0, Number(data.correctAnswers ?? 0)),
      );
  });
  const progresses = await db.collection("user_progress").get();
  report.read += progresses.size;
  for (let index = 0; index < progresses.docs.length; index += 400) {
    const batch = db.batch();
    progresses.docs.slice(index, index + 400).forEach((doc) => {
      const data = doc.data();
      batch.set(
        doc.ref,
        {
          "games.correctAnswers": Number(
            data.games?.correctAnswers ?? correctByUser.get(doc.id) ?? 0,
          ),
          ranking: {
            score: calculateRankingScore(data, settings.ranking),
            updatedAt: Timestamp.now(),
          },
        },
        { merge: true },
      );
      report.updated++;
    });
    await batch.commit();
  }
  console.log(
    JSON.stringify(
      {
        projectId: process.env.FIREBASE_PROJECT_ID,
        migration: "gamification-v2",
        ...report,
      },
      null,
      2,
    ),
  );
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
