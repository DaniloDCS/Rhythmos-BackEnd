import { Timestamp, DocumentData } from "firebase-admin/firestore";

import type {
  AssessmentScope,
  AssessmentStatus,
  IAssessmentQuestion,
  IAssessment,
} from "./assessment.types";

export type {
  AssessmentScope,
  AssessmentStatus,
  AssessmentQuestionType,
  IAssessmentOption,
  IAssessmentQuestion,
  IAssessment,
} from "./assessment.types";

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .map(String)
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ]
    : [];

export class Assessment implements IAssessment {
  id: string;
  trailId: string;
  moduleId: string;
  lessonId?: string;
  scope: AssessmentScope;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts?: number;
  required: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  questions: IAssessmentQuestion[];
  status: AssessmentStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  constructor(data: Partial<IAssessment> & Pick<IAssessment, "id">) {
    this.id = data.id;
    this.trailId = data.trailId?.trim() ?? "";
    this.moduleId = data.moduleId?.trim() ?? "";
    this.lessonId = data.lessonId?.trim() || undefined;
    this.scope = data.scope ?? "module";
    this.title = data.title?.trim() || "Nova avaliação";
    this.description = data.description?.trim() || undefined;
    this.passingScore = Number.isFinite(data.passingScore)
      ? Math.min(100, Math.max(0, Number(data.passingScore)))
      : 70;
    this.maxAttempts = data.maxAttempts
      ? Math.max(1, Math.floor(data.maxAttempts))
      : undefined;
    this.required = data.required ?? true;
    this.shuffleQuestions = data.shuffleQuestions ?? false;
    this.shuffleOptions = data.shuffleOptions ?? false;
    this.questions = Array.isArray(data.questions)
      ? data.questions.map((question) => ({
          id: question.id,
          type: question.type ?? "single",
          prompt: question.prompt?.trim() ?? "",
          points: Math.max(0.01, Number(question.points) || 1),
          explanation: question.explanation?.trim() || undefined,
          contentTags: normalizeStringArray(question.contentTags),
          competencyIds: normalizeStringArray(question.competencyIds),
          options: Array.isArray(question.options)
            ? question.options.map((option) => ({
                id: option.id,
                text: option.text?.trim() ?? "",
                correct: option.correct === true,
              }))
            : [],
        }))
      : [];
    this.status = data.status ?? "rascunho";
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.createdAt = data.createdAt ?? Timestamp.now();
    this.updatedAt = data.updatedAt ?? Timestamp.now();
    this.validate();
  }

  validate() {
    if (!this.trailId) throw new Error("trailId é obrigatório.");
    if (!this.moduleId) throw new Error("moduleId é obrigatório.");
    if (this.scope === "lesson" && !this.lessonId) {
      throw new Error("lessonId é obrigatório em avaliações de aula.");
    }
    if (!this.title) throw new Error("O título da avaliação é obrigatório.");
    if (this.status === "disponivel" && this.questions.length === 0) {
      throw new Error(
        "Uma avaliação disponível precisa ter pelo menos uma questão.",
      );
    }

    for (const question of this.questions) {
      if (!question.id) throw new Error("Toda questão precisa de id.");
      if (!question.prompt)
        throw new Error("Toda questão precisa de enunciado.");
      if (question.options.length < 2) {
        throw new Error(
          `A questão "${question.prompt}" precisa de ao menos duas opções.`,
        );
      }
      if (!question.options.some((option) => option.correct)) {
        throw new Error(
          `A questão "${question.prompt}" precisa de resposta correta.`,
        );
      }
      if (
        question.type !== "multiple" &&
        question.options.filter((option) => option.correct).length !== 1
      ) {
        throw new Error(
          `A questão "${question.prompt}" aceita apenas uma resposta correta.`,
        );
      }
    }
  }

  toObject(): IAssessment {
    return {
      id: this.id,
      trailId: this.trailId,
      moduleId: this.moduleId,
      ...(this.lessonId ? { lessonId: this.lessonId } : {}),
      scope: this.scope,
      title: this.title,
      ...(this.description ? { description: this.description } : {}),
      passingScore: this.passingScore,
      ...(this.maxAttempts ? { maxAttempts: this.maxAttempts } : {}),
      required: this.required,
      shuffleQuestions: this.shuffleQuestions,
      shuffleOptions: this.shuffleOptions,
      questions: this.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        options: question.options,
        ...(question.explanation ? { explanation: question.explanation } : {}),
        ...(question.contentTags?.length
          ? { contentTags: question.contentTags }
          : {}),
        ...(question.competencyIds?.length
          ? { competencyIds: question.competencyIds }
          : {}),
      })),
      status: this.status,
      ...(this.createdBy ? { createdBy: this.createdBy } : {}),
      ...(this.updatedBy ? { updatedBy: this.updatedBy } : {}),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toPublicObject() {
    const source = this.toObject();
    return {
      ...source,
      questions: source.questions.map((question) => ({
        ...question,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      })),
    };
  }

  static fromFirestore(id: string, data: DocumentData): Assessment {
    return new Assessment({ id, ...(data as Omit<IAssessment, "id">) });
  }
}
