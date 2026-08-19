import type { DocumentData } from "firebase-admin/firestore";
import type {
  IClinicalCase,
  IClinicalCaseMetrics,
  IClinicalCasePublic,
} from "./clinical.types";

const defaultMetrics = (): IClinicalCaseMetrics => ({
  attempts: 0,
  correctAttempts: 0,
  completions: 0,
});

export class ClinicalCaseModel {
  static fromFirestore(id: string, data: DocumentData): IClinicalCase {
    return {
      id,
      sequence: Number(data.sequence ?? 0),
      title: String(data.title ?? ""),
      shortDescription: data.shortDescription
        ? String(data.shortDescription)
        : undefined,
      clinicalCase: String(data.clinicalCase ?? ""),
      history: data.history ? String(data.history) : undefined,
      patient: data.patient ? String(data.patient) : undefined,
      clinicalInfo: Array.isArray(data.clinicalInfo) ? data.clinicalInfo : [],
      ecg: data.ecg ?? {},
      analysisSteps: Array.isArray(data.analysisSteps)
        ? data.analysisSteps
        : [],
      correctAnswer: String(data.correctAnswer ?? ""),
      acceptedAnswers: Array.isArray(data.acceptedAnswers)
        ? data.acceptedAnswers.map(String)
        : [],
      feedbackCorrect: data.feedbackCorrect
        ? String(data.feedbackCorrect)
        : undefined,
      feedbackIncorrect: data.feedbackIncorrect
        ? String(data.feedbackIncorrect)
        : undefined,
      status:
        data.status === "publicado" || data.status === "arquivado"
          ? data.status
          : "rascunho",
      metrics: {
        ...defaultMetrics(),
        ...(data.metrics ?? {}),
      },
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
      publishedAt: data.publishedAt ?? null,
    };
  }

  static toPublic(item: IClinicalCase, completed = false): IClinicalCasePublic {
    return {
      id: item.id,
      sequence: item.sequence,
      title: item.title,
      shortDescription: item.shortDescription,
      clinicalCase: item.clinicalCase,
      history: item.history,
      patient: item.patient,
      clinicalInfo: item.clinicalInfo ?? [],
      ecg: item.ecg,
      analysisSteps: item.analysisSteps ?? [],
      completed,
    };
  }
}
