import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type { IUserProgress } from "../users/user-progress.types";
import type { ILevel } from "../levels/level.model";
import { calculateUpdatedStreak } from "../users/user-progress.controller";
import { DEFAULT_CLINICAL_ANALYSIS_STEPS } from "./clinical.constants";
import { ClinicalCaseModel } from "./clinical.model";
import { clinicalRepository } from "./clinical.repository";
import {
  CLINICAL_CASE_XP,
  type ClinicalCaseStatus,
  type ClinicalStepAnswers,
  type IClinicalCase,
  type IClinicalCaseAnswerResponse,
  type IClinicalCaseECG,
  type IClinicalCaseInfoItem,
  type IClinicalCaseStep,
} from "./clinical.types";
export class ClinicalError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ClinicalError";
  }
}
const cleanString = (value: unknown) => String(value ?? "").trim();
const cleanOptional = (value: unknown) => {
  const result = cleanString(value);
  return result || undefined;
};
const stringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanString(item)).filter(Boolean))];
};
const normalizeAnswer = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const normalizeSteps = (value: unknown): IClinicalCaseStep[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const step = (item ?? {}) as Record<string, unknown>;
      const options = Array.isArray(step.options)
        ? step.options.map((option) => cleanString(option)).filter(Boolean)
        : undefined;
      const rawType = cleanString(step.type);
      const type = ["text", "textarea", "select", "number"].includes(rawType)
        ? (rawType as IClinicalCaseStep["type"])
        : undefined;
      return {
        id: cleanString(step.id),
        order: Number(step.order ?? index + 1),
        label: cleanString(step.label),
        description: cleanOptional(step.description),
        placeholder: cleanOptional(step.placeholder),
        type,
        options,
      };
    })
    .filter((step) => step.id && step.label)
    .sort((a, b) => a.order - b.order);
};
const normalizeClinicalInfo = (value: unknown): IClinicalCaseInfoItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const info = (item ?? {}) as Record<string, unknown>;
      return {
        label: cleanString(info.label),
        value: cleanString(info.value),
      };
    })
    .filter((item) => item.label && item.value);
};
const normalizeEcg = (value: unknown): IClinicalCaseECG => {
  const ecg =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const pathological = Array.isArray(ecg.pathological)
    ? ecg.pathological.map(String)
    : ecg.pathological
      ? String(ecg.pathological)
      : undefined;
  const fc = Number(ecg.fc);
  const paperSpeed = Number(ecg.paperSpeed);
  const gain = Number(ecg.gain);
  return {
    imageUrl: cleanOptional(ecg.imageUrl),
    rhythm: cleanOptional(ecg.rhythm),
    fc: Number.isFinite(fc) && fc > 0 ? fc : undefined,
    pathological,
    paperSpeed: Number.isFinite(paperSpeed) && paperSpeed > 0 ? paperSpeed : 25,
    gain: Number.isFinite(gain) && gain > 0 ? gain : 10,
  };
};
const validateSteps = (steps: IClinicalCaseStep[]) => {
  if (!steps.length) return;
  if (steps.length !== 10) {
    throw new ClinicalError(
      400,
      "analysisSteps deve ficar vazio para usar os passos padrão ou conter exatamente 10 passos.",
    );
  }
  const ids = new Set(steps.map((item) => item.id));
  const orders = new Set(steps.map((item) => item.order));
  if (ids.size !== 10 || orders.size !== 10) {
    throw new ClinicalError(
      400,
      "Os 10 passos precisam ter IDs e ordens únicos.",
    );
  }
};
const validatePublishable = (item: IClinicalCase) => {
  if (!item.title || !item.clinicalCase || !item.correctAnswer) {
    throw new ClinicalError(
      400,
      "Título, caso clínico e resposta correta são obrigatórios para publicar.",
    );
  }
  if (!item.ecg.imageUrl && !item.ecg.rhythm) {
    throw new ClinicalError(
      400,
      "Informe ecg.imageUrl ou ecg.rhythm antes de publicar.",
    );
  }
  validateSteps(item.analysisSteps ?? []);
};
const expectedSteps = (item: IClinicalCase) => {
  const steps = item.analysisSteps?.length
    ? item.analysisSteps
    : DEFAULT_CLINICAL_ANALYSIS_STEPS;
  return [...steps].sort((a, b) => a.order - b.order).slice(0, 10);
};
const validateAnalysis = (
  item: IClinicalCase,
  analysis: ClinicalStepAnswers,
) => {
  const steps = expectedSteps(item);
  if (steps.length !== 10) {
    throw new ClinicalError(
      500,
      "O caso não possui 10 passos de análise configurados.",
    );
  }
  const missing = steps
    .filter((step) => !cleanString(analysis[step.id]))
    .map((step) => step.label);
  if (missing.length) {
    throw new ClinicalError(
      400,
      `Preencha os 10 passos antes de enviar. Faltando: ${missing.join(", ")}.`,
    );
  }
};
const answerIsCorrect = (item: IClinicalCase, answer: string) => {
  const received = normalizeAnswer(answer);
  const accepted = [item.correctAnswer, ...(item.acceptedAnswers ?? [])]
    .map(normalizeAnswer)
    .filter(Boolean);
  return accepted.includes(received);
};
export class ClinicalService {
  async listPublic(userId: string) {
    const [cases, completedIds] = await Promise.all([
      clinicalRepository.listPublished(),
      clinicalRepository.getCompletedCaseIds(userId),
    ]);
    const completed = new Set(completedIds);
    return cases.map((item) =>
      ClinicalCaseModel.toPublic(item, completed.has(item.id)),
    );
  }
  async listAdmin(limit: number, cursor?: string) {
    return clinicalRepository.listAdmin(limit, cursor);
  }
  async getAdmin(id: string) {
    const item = await clinicalRepository.getById(id);
    if (!item) throw new ClinicalError(404, "Caso clínico não encontrado.");
    return item;
  }
  stats() {
    return clinicalRepository.stats();
  }
  async attempts(id: string) {
    await this.getAdmin(id);
    return clinicalRepository.listAttempts(id);
  }
  private async ensureSequence(sequence: number, ignoreId?: string) {
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 10) {
      throw new ClinicalError(400, "sequence deve ser um número de 1 a 10.");
    }
    const duplicate = await clinicalRepository.findBySequence(
      sequence,
      ignoreId,
    );
    if (duplicate) {
      throw new ClinicalError(409, `Já existe um caso na posição ${sequence}.`);
    }
  }
  private normalizePayload(body: Record<string, unknown>, partial = false) {
    const statusRaw = cleanString(body.status);
    const status: ClinicalCaseStatus =
      statusRaw === "publicado" || statusRaw === "arquivado"
        ? statusRaw
        : "rascunho";
    const payload: Partial<IClinicalCase> = {};
    const set = <K extends keyof IClinicalCase>(
      key: K,
      value: IClinicalCase[K],
    ) => {
      if (!partial || body[key] !== undefined) payload[key] = value;
    };
    set("sequence", Number(body.sequence ?? 0));
    set("title", cleanString(body.title));
    set("shortDescription", cleanOptional(body.shortDescription));
    set("clinicalCase", cleanString(body.clinicalCase));
    set("history", cleanOptional(body.history));
    set("patient", cleanOptional(body.patient));
    set("clinicalInfo", normalizeClinicalInfo(body.clinicalInfo));
    set("ecg", normalizeEcg(body.ecg));
    set("analysisSteps", normalizeSteps(body.analysisSteps));
    set("correctAnswer", cleanString(body.correctAnswer));
    set("acceptedAnswers", stringArray(body.acceptedAnswers));
    set("feedbackCorrect", cleanOptional(body.feedbackCorrect));
    set("feedbackIncorrect", cleanOptional(body.feedbackIncorrect));
    set("status", status);
    return payload;
  }
  async create(body: Record<string, unknown>, userId: string) {
    const payload = this.normalizePayload(body, false) as Omit<
      IClinicalCase,
      "id" | "metrics"
    >;
    if (!payload.title || !payload.clinicalCase || !payload.correctAnswer) {
      throw new ClinicalError(
        400,
        "title, clinicalCase e correctAnswer são obrigatórios.",
      );
    }
    await this.ensureSequence(payload.sequence);
    validateSteps(payload.analysisSteps ?? []);
    const now = Timestamp.now();
    const data: Omit<IClinicalCase, "id"> = {
      ...payload,
      metrics: { attempts: 0, correctAttempts: 0, completions: 0 },
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      publishedAt: payload.status === "publicado" ? now : null,
    };
    const candidate = { id: "new", ...data } as IClinicalCase;
    if (candidate.status === "publicado") validatePublishable(candidate);
    return clinicalRepository.create(data);
  }
  async update(id: string, body: Record<string, unknown>, userId: string) {
    const current = await this.getAdmin(id);
    const patch = this.normalizePayload(body, true);
    if (patch.sequence !== undefined && patch.sequence !== current.sequence) {
      await this.ensureSequence(patch.sequence, id);
    }
    const merged: IClinicalCase = {
      ...current,
      ...patch,
      metrics: current.metrics,
      updatedBy: userId,
      updatedAt: Timestamp.now(),
    };
    validateSteps(merged.analysisSteps ?? []);
    if (merged.status === "publicado") validatePublishable(merged);
    const publishedAt =
      current.status !== "publicado" && merged.status === "publicado"
        ? Timestamp.now()
        : current.publishedAt;
    return clinicalRepository.update(id, {
      ...patch,
      metrics: current.metrics,
      updatedBy: userId,
      updatedAt: Timestamp.now(),
      publishedAt,
    });
  }
  async updateStatus(id: string, status: ClinicalCaseStatus, userId: string) {
    const current = await this.getAdmin(id);
    const merged = { ...current, status };
    if (status === "publicado") validatePublishable(merged);
    return clinicalRepository.update(id, {
      status,
      updatedBy: userId,
      updatedAt: Timestamp.now(),
      publishedAt:
        status === "publicado" && current.status !== "publicado"
          ? Timestamp.now()
          : current.publishedAt,
    });
  }
  async delete(id: string) {
    await this.getAdmin(id);
    if (await clinicalRepository.hasProgressForCase(id)) {
      throw new ClinicalError(
        409,
        "Este caso já possui conclusões. Arquive-o para preservar o histórico.",
      );
    }
    await clinicalRepository.delete(id);
  }
  async answer(
    userId: string,
    caseId: string,
    analysis: ClinicalStepAnswers,
    answer: string,
  ): Promise<IClinicalCaseAnswerResponse> {
    if (!caseId) throw new ClinicalError(400, "ID do caso é obrigatório.");
    if (!answer.trim())
      throw new ClinicalError(400, "A resposta final é obrigatória.");
    const levelsSnapshot = await db.collection("levels").get();
    const levels = levelsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          active: data.active === true || data.active === "true",
        } as ILevel;
      })
      .filter((level) => level.active)
      .sort((a, b) => a.levelNumber - b.levelNumber);
    if (!levels.length) {
      throw new ClinicalError(500, "Nenhum nível ativo foi cadastrado.");
    }
    const caseRef = clinicalRepository.caseRef(caseId);
    const completionRef = clinicalRepository.progressRef(userId, caseId);
    const userProgressRef = clinicalRepository.userProgressRef(userId);
    const attemptRef = clinicalRepository.attemptRef();
    const now = Timestamp.now();
    let result: IClinicalCaseAnswerResponse | undefined;
    await db.runTransaction(async (transaction) => {
      const caseDoc = await transaction.get(caseRef);
      const completionDoc = await transaction.get(completionRef);
      if (!caseDoc.exists) {
        throw new ClinicalError(404, "Caso clínico não encontrado.");
      }
      const item = ClinicalCaseModel.fromFirestore(caseDoc.id, caseDoc.data()!);
      if (item.status !== "publicado") {
        throw new ClinicalError(404, "Caso clínico indisponível.");
      }
      validateAnalysis(item, analysis);
      const correct = answerIsCorrect(item, answer);
      const alreadyCompleted =
        completionDoc.exists && completionDoc.data()?.completed === true;
      if (!correct) {
        transaction.set(attemptRef, {
          id: attemptRef.id,
          userId,
          caseId,
          analysis,
          answer: answer.trim(),
          correct: false,
          awarded: false,
          xpAwarded: 0,
          createdAt: now,
        });
        transaction.update(caseRef, {
          "metrics.attempts": FieldValue.increment(1),
          updatedAt: now,
        });
        result = {
          correct: false,
          awarded: false,
          xpAdded: 0,
          feedback:
            item.feedbackIncorrect ||
            "Confira novamente os dez passos antes de tentar outra vez.",
        };
        return;
      }
      if (alreadyCompleted) {
        transaction.set(attemptRef, {
          id: attemptRef.id,
          userId,
          caseId,
          analysis,
          answer: answer.trim(),
          correct: true,
          awarded: false,
          xpAwarded: 0,
          createdAt: now,
        });
        transaction.update(caseRef, {
          "metrics.attempts": FieldValue.increment(1),
          "metrics.correctAttempts": FieldValue.increment(1),
          updatedAt: now,
        });
        result = {
          correct: true,
          awarded: false,
          xpAdded: 0,
          correctAnswer: item.correctAnswer,
          feedback:
            item.feedbackCorrect ||
            "Interpretação correta. Este caso já havia sido concluído.",
        };
        return;
      }
      const progressDoc = await transaction.get(userProgressRef);
      if (!progressDoc.exists) {
        throw new ClinicalError(
          404,
          "Progresso global do usuário não encontrado.",
        );
      }
      const progress = progressDoc.data() as IUserProgress;
      const oldXp = progress.xp?.total ?? 0;
      const oldLevel = progress.level?.current ?? 1;
      const newXp = oldXp + CLINICAL_CASE_XP;
      const currentLevel =
        [...levels].reverse().find((level) => newXp >= level.xpMin) ??
        levels[0];
      const currentIndex = levels.findIndex(
        (level) => level.levelNumber === currentLevel.levelNumber,
      );
      const nextLevel = levels[currentIndex + 1];
      const currentLevelXp = Math.max(0, newXp - currentLevel.xpMin);
      const levelRange = nextLevel
        ? nextLevel.xpMin - currentLevel.xpMin
        : Math.max(0, currentLevel.xpMax - currentLevel.xpMin);
      const progressPercent =
        nextLevel && levelRange > 0
          ? Math.min(
              100,
              Number(((currentLevelXp / levelRange) * 100).toFixed(2)),
            )
          : 100;
      const updatedLevels = [...(progress.levels ?? [])];
      const newlyReached = levels.filter(
        (level) =>
          level.levelNumber > oldLevel &&
          level.levelNumber <= currentLevel.levelNumber,
      );
      for (const level of newlyReached) {
        if (!updatedLevels.some((item) => item.level === level.levelNumber)) {
          updatedLevels.push({
            level: level.levelNumber,
            title: level.name,
            unlocked: true,
            reachedAt: new Date().toISOString(),
          });
        }
      }
      updatedLevels.sort((a, b) => a.level - b.level);
      const streakResult = calculateUpdatedStreak(progress);
      const previousStats = progress.stats ?? {
        quizzesCompleted: 0,
        simulationsCompleted: 0,
        trailsCompleted: 0,
        supportMaterialsViewed: 0,
      };
      const updatedProgress: IUserProgress = {
        ...progress,
        xp: {
          ...progress.xp,
          total: newXp,
          currentLevelXp: nextLevel
            ? currentLevelXp
            : Math.min(currentLevelXp, levelRange),
          nextLevelXp: Math.max(levelRange, 0),
        },
        level: {
          ...progress.level,
          current: currentLevel.levelNumber,
          currentTitle: currentLevel.name,
          progressPercent,
        },
        levels: updatedLevels,
        streak: streakResult.streak,
        stats: {
          ...previousStats,
          simulationsCompleted: (previousStats.simulationsCompleted ?? 0) + 1,
        },
        updatedAt: now,
      };
      transaction.set(attemptRef, {
        id: attemptRef.id,
        userId,
        caseId,
        analysis,
        answer: answer.trim(),
        correct: true,
        awarded: true,
        xpAwarded: CLINICAL_CASE_XP,
        createdAt: now,
      });
      transaction.set(completionRef, {
        id: completionRef.id,
        userId,
        caseId,
        completed: true,
        xpAwarded: CLINICAL_CASE_XP,
        firstCorrectAttemptId: attemptRef.id,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      transaction.update(caseRef, {
        "metrics.attempts": FieldValue.increment(1),
        "metrics.correctAttempts": FieldValue.increment(1),
        "metrics.completions": FieldValue.increment(1),
        updatedAt: now,
      });
      transaction.set(userProgressRef, updatedProgress, { merge: true });
      result = {
        correct: true,
        awarded: true,
        xpAdded: CLINICAL_CASE_XP,
        correctAnswer: item.correctAnswer,
        feedback: item.feedbackCorrect || "Resposta correta.",
        progress: updatedProgress,
        levelUp: currentLevel.levelNumber > oldLevel,
        level: {
          previous: oldLevel,
          current: currentLevel.levelNumber,
          title: currentLevel.name,
          progressPercent,
        },
      };
    });
    if (!result) {
      throw new ClinicalError(500, "Não foi possível processar a resposta.");
    }
    return result;
  }
}
export const clinicalService = new ClinicalService();
