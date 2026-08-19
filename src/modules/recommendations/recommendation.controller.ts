import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { db } from "../../config/firebase";

const iso = (value: any) => value?.toDate?.()?.toISOString?.() ?? value ?? null;
export const getMyRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user!.uid;
  const [enrollmentsSnap, trailsSnap, gamesSnap, attemptsSnap, progressDoc] = await Promise.all([
    db.collection("enrollments").where("userId", "==", uid).get(), db.collection("trails").get(), db.collection("games").get(), db.collection("assessment_attempts").where("userId", "==", uid).limit(100).get(), db.collection("user_progress").doc(uid).get(),
  ]);
  const enrollments = enrollmentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
  const enrolled = new Set(enrollments.map((item) => item.trailId)); const completed = new Set(enrollments.filter((item) => item.status === "concluido").map((item) => item.trailId));
  const trails = trailsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
  const nextTrails = trails.filter((trail) => trail.status === "disponivel" && !enrolled.has(trail.id) && (trail.prerequisiteTrailIds ?? []).every((id: string) => completed.has(id))).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)).slice(0, 3).map((trail) => ({ id: trail.id, title: trail.title, description: trail.description, thumbnailUrl: trail.thumbnailUrl, path: "/trails", reason: trail.prerequisiteTrailIds?.length ? "Seus pré-requisitos já foram concluídos." : "É a próxima trilha disponível na sequência de aprendizagem." }));
  const attempts = attemptsSnap.docs.map((doc) => doc.data()) as any[]; const weak = attempts.filter((item) => Number(item.score ?? item.percentage ?? 100) < 70).sort((a, b) => String(iso(b.createdAt)).localeCompare(String(iso(a.createdAt)))).slice(0, 3);
  const reinforcement = weak.map((item, index) => ({ id: item.lessonId ?? item.assessmentId ?? `reinforcement-${index}`, title: item.lessonTitle ?? item.assessmentTitle ?? "Revisar conteúdo avaliado", path: item.enrollmentId ? `/lesson/${item.enrollmentId}` : "/trails", score: Number(item.score ?? item.percentage ?? 0), reason: `Seu resultado recente foi ${Number(item.score ?? item.percentage ?? 0)}%. Uma revisão pode consolidar este conteúdo.` }));
  const progress = progressDoc.data() as any; const unlocked = progress?.unlocked?.games ?? {};
  const games = gamesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[];
  const recommendedGames = games.filter((game) => game.status === "disponivel" && (Object.keys(unlocked).length === 0 || unlocked[game.id])).sort((a, b) => Number(a.metrics?.plays ?? 0) - Number(b.metrics?.plays ?? 0)).slice(0, 3).map((game) => ({ id: game.id, title: game.name, description: game.shortDescription, thumbnailUrl: game.thumbnailUrl, path: `/games/${game.slug}`, reason: reinforcement.length ? "Prática recomendada para reforçar os conteúdos com maior dificuldade." : "Uma atividade disponível para diversificar sua prática." }));
  const sevenDays = Date.now() - 7 * 86400000; const reviewIds = new Set<string>(); enrollments.forEach((item) => { const last = new Date(iso(item.lastAccessAt) ?? 0).getTime(); if (last < sevenDays) Object.entries(item.completedLessonsMap ?? {}).forEach(([id, done]) => { if (done) reviewIds.add(id); }); });
  const reviewDocs = await Promise.all([...reviewIds].slice(0, 3).map((id) => db.collection("lessons").doc(id).get()));
  const spacedReview = reviewDocs.filter((doc) => doc.exists).map((doc) => { const data: any = doc.data(); return { id: doc.id, title: data.title ?? data.version?.title ?? "Aula concluída", enrollmentId: enrollments.find((item) => item.completedLessonsMap?.[doc.id])?.id, path: `/lesson/${enrollments.find((item) => item.completedLessonsMap?.[doc.id])?.id}`, reason: "Você concluiu esta aula há algum tempo. Uma revisão rápida ajuda na retenção." }; });
  res.json({ nextTrails, reinforcement, games: recommendedGames, spacedReview, generatedAt: new Date().toISOString() });
};
