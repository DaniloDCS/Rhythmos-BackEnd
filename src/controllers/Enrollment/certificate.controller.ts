import type { Response } from "express";
import { Timestamp } from "firebase-admin/firestore";

import { db } from "../../config/firebase";
import type { AuthenticatedRequest } from "../../middlewares/authMiddleware";

import type { IEnrollment } from "../../interfaces/Enrollment.interface";
import type {
  ICertificate,
  ICertificateLesson,
  ICertificateModule,
} from "../../interfaces/Certificate.interface";

const CERTIFICATES_COLLECTION = "certificates";
const CERTIFICATE_ENROLLMENTS_COLLECTION = "certificateEnrollments";

const ENROLLMENTS_COLLECTION = "enrollments";
const TRAILS_COLLECTION = "trails";
const USERS_COLLECTION = "users";
const MODULES_COLLECTION = "modules";
const LESSONS_COLLECTION = "lessons";

/*
 * =====================================================
 * TIPOS INTERNOS
 * =====================================================
 */

type CertificateTransactionResult = {
  certificate: ICertificate;
  created: boolean;
};

type CertificateProgramSnapshot = {
  program: ICertificateModule[];
  totalModules: number;
  totalLessons: number;
  workloadMinutes: number;
};

type CertificateSourceData = {
  userName: string;
  trailTitle: string;

  workloadHours?: number;
  workloadMinutes?: number;

  totalModules: number;
  totalLessons: number;

  program: ICertificateModule[];

  startedAt?: Timestamp;
  completedAt?: Timestamp;
};

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

const removeUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefined(item)) as T;
  }

  if (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Timestamp)
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefined(item)]),
    ) as T;
  }

  return value;
};

const toPositiveNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const toSequence = (value: unknown, fallback: number) => {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return fallback;
};

const minutesToHours = (minutes: number) => {
  return Math.round((minutes / 60) * 100) / 100;
};

const resolveLessonWorkloadMinutes = (
  lesson: Record<string, unknown>,
  version?: Record<string, unknown> | null,
) => {
  return (
    toPositiveNumber(lesson.estimatedMinutes) ??
    toPositiveNumber(lesson.durationInMinutes) ??
    toPositiveNumber(lesson.readingTimeMinutes) ??
    toPositiveNumber(version?.estimatedMinutes) ??
    toPositiveNumber(version?.durationInMinutes) ??
    toPositiveNumber(version?.readingTimeMinutes) ??
    0
  );
};

const getLessonCurrentVersion = async (
  lessonId: string,
  currentVersionId: unknown,
) => {
  if (typeof currentVersionId !== "string" || !currentVersionId.trim()) {
    return null;
  }

  const versionDoc = await db
    .collection(LESSONS_COLLECTION)
    .doc(lessonId)
    .collection("versions")
    .doc(currentVersionId)
    .get();

  if (!versionDoc.exists) {
    return null;
  }

  return versionDoc.data() as Record<string, unknown>;
};

/*
 * =====================================================
 * CONTEÚDO PROGRAMÁTICO
 * =====================================================
 */

const buildProgramSnapshot = async (
  trailId: string,
): Promise<CertificateProgramSnapshot> => {
  /*
   * Usamos os conteúdos disponíveis, que são os mesmos
   * considerados no fluxo normal da trilha.
   */
  const modulesSnapshot = await db
    .collection(MODULES_COLLECTION)
    .where("trailId", "==", trailId)
    .where("status", "==", "disponivel")
    .orderBy("sequence", "asc")
    .get();

  const program: ICertificateModule[] = [];

  let totalLessons = 0;
  let totalWorkloadMinutes = 0;

  for (
    let moduleIndex = 0;
    moduleIndex < modulesSnapshot.docs.length;
    moduleIndex += 1
  ) {
    const moduleDoc = modulesSnapshot.docs[moduleIndex];

    const moduleData = moduleDoc.data() as Record<string, unknown>;

    const lessonsSnapshot = await db
      .collection(LESSONS_COLLECTION)
      .where("moduleId", "==", moduleDoc.id)
      .where("status", "==", "disponivel")
      .orderBy("sequence", "asc")
      .get();

    const lessons: ICertificateLesson[] = [];

    let moduleWorkloadMinutes = 0;

    for (
      let lessonIndex = 0;
      lessonIndex < lessonsSnapshot.docs.length;
      lessonIndex += 1
    ) {
      const lessonDoc = lessonsSnapshot.docs[lessonIndex];

      const lessonData = lessonDoc.data() as Record<string, unknown>;

      const version = await getLessonCurrentVersion(
        lessonDoc.id,
        lessonData.currentVersionId,
      );

      const workloadMinutes = resolveLessonWorkloadMinutes(lessonData, version);

      const lessonTitle = String(
        version?.title ?? lessonData.title ?? `Aula ${lessonIndex + 1}`,
      ).trim();

      const lesson: ICertificateLesson = {
        id: lessonDoc.id,

        title: lessonTitle,

        sequence: toSequence(lessonData.sequence, lessonIndex + 1),
      };

      if (workloadMinutes > 0) {
        lesson.workloadMinutes = Math.round(workloadMinutes);
      }

      lessons.push(lesson);

      moduleWorkloadMinutes += workloadMinutes;

      totalWorkloadMinutes += workloadMinutes;

      totalLessons += 1;
    }

    const module: ICertificateModule = {
      id: moduleDoc.id,

      title: String(
        moduleData.title ?? moduleData.name ?? `Módulo ${moduleIndex + 1}`,
      ).trim(),

      sequence: toSequence(moduleData.sequence, moduleIndex + 1),

      lessons,
    };

    if (moduleWorkloadMinutes > 0) {
      module.workloadMinutes = Math.round(moduleWorkloadMinutes);
    }

    program.push(module);
  }

  return {
    program,

    totalModules: program.length,

    totalLessons,

    workloadMinutes: Math.round(totalWorkloadMinutes),
  };
};

/*
 * =====================================================
 * CARGA HORÁRIA
 * =====================================================
 */

const resolveCertificateWorkload = (
  trail: Record<string, unknown>,
  calculatedMinutes: number,
) => {
  /*
   * Prioridade:
   *
   * 1. Carga horária oficial da trilha.
   * 2. Tempo estimado da trilha.
   * 3. Soma das aulas.
   */

  const workloadHours = toPositiveNumber(trail.workloadHours);

  if (workloadHours !== null) {
    return {
      workloadHours: Math.round(workloadHours * 100) / 100,

      workloadMinutes: Math.round(workloadHours * 60),
    };
  }

  const trailEstimatedMinutes = toPositiveNumber(trail.estimatedMinutes);

  if (trailEstimatedMinutes !== null) {
    const workloadMinutes = Math.round(trailEstimatedMinutes);

    return {
      workloadMinutes,

      workloadHours: minutesToHours(workloadMinutes),
    };
  }

  if (calculatedMinutes > 0) {
    return {
      workloadMinutes: calculatedMinutes,

      workloadHours: minutesToHours(calculatedMinutes),
    };
  }

  return {};
};

/*
 * =====================================================
 * DADOS DE ORIGEM DO CERTIFICADO
 * =====================================================
 */

const buildCertificateSourceData = async (
  enrollment: IEnrollment & {
    id: string;
  },

  userId: string,
): Promise<CertificateSourceData> => {
  const [trailDoc, userDoc, programSnapshot] = await Promise.all([
    db.collection(TRAILS_COLLECTION).doc(enrollment.trailId).get(),

    db.collection(USERS_COLLECTION).doc(userId).get(),

    buildProgramSnapshot(enrollment.trailId),
  ]);

  if (!trailDoc.exists) {
    throw Object.assign(new Error("Trilha não encontrada."), {
      status: 404,
    });
  }

  const trail = trailDoc.data() as Record<string, unknown>;

  const user = userDoc.exists
    ? (userDoc.data() as Record<string, unknown>)
    : {};

  const workload = resolveCertificateWorkload(
    trail,
    programSnapshot.workloadMinutes,
  );

  const data: CertificateSourceData = {
    userName: String(
      user.name ?? user.displayName ?? user.username ?? "Usuário",
    ),

    trailTitle: String(trail.title ?? "Trilha de aprendizagem"),

    totalModules: programSnapshot.totalModules,

    totalLessons: programSnapshot.totalLessons,

    program: programSnapshot.program,
  };

  if (workload.workloadHours !== undefined) {
    data.workloadHours = workload.workloadHours;
  }

  if (workload.workloadMinutes !== undefined) {
    data.workloadMinutes = workload.workloadMinutes;
  }

  if (enrollment.startedAt) {
    data.startedAt = enrollment.startedAt;
  }

  if (enrollment.completedAt) {
    data.completedAt = enrollment.completedAt;
  }

  return data;
};

/*
 * =====================================================
 * BACKFILL DE CERTIFICADOS ANTIGOS
 * =====================================================
 */

const hydrateLegacyCertificate = async (
  certificate: ICertificate,
): Promise<ICertificate> => {
  const hasProgram =
    Array.isArray(certificate.program) && certificate.program.length > 0;

  const hasWorkload =
    toPositiveNumber(certificate.workloadHours) !== null ||
    toPositiveNumber(certificate.workloadMinutes) !== null;

  const hasCounts =
    typeof certificate.totalModules === "number" &&
    typeof certificate.totalLessons === "number";

  const hasDates =
    Boolean(certificate.startedAt) && Boolean(certificate.completedAt);

  if (hasProgram && hasWorkload && hasCounts && hasDates) {
    return certificate;
  }

  const enrollmentDoc = await db
    .collection(ENROLLMENTS_COLLECTION)
    .doc(certificate.enrollmentId)
    .get();

  if (!enrollmentDoc.exists) {
    return certificate;
  }

  const enrollment = {
    ...(enrollmentDoc.data() as Omit<IEnrollment, "id">),

    id: enrollmentDoc.id,
  } as IEnrollment & {
    id: string;
  };

  const source = await buildCertificateSourceData(
    enrollment,
    certificate.userId,
  );

  const patch: Partial<ICertificate> = {};

  if (!hasProgram) {
    patch.program = source.program;
  }

  if (typeof certificate.totalModules !== "number") {
    patch.totalModules = source.totalModules;
  }

  if (typeof certificate.totalLessons !== "number") {
    patch.totalLessons = source.totalLessons;
  }

  if (
    toPositiveNumber(certificate.workloadMinutes) === null &&
    source.workloadMinutes !== undefined
  ) {
    patch.workloadMinutes = source.workloadMinutes;
  }

  if (
    toPositiveNumber(certificate.workloadHours) === null &&
    source.workloadHours !== undefined
  ) {
    patch.workloadHours = source.workloadHours;
  }

  if (!certificate.startedAt && source.startedAt) {
    patch.startedAt = source.startedAt;
  }

  if (!certificate.completedAt && source.completedAt) {
    patch.completedAt = source.completedAt;
  }

  const safePatch = removeUndefined(patch);

  if (Object.keys(safePatch).length === 0) {
    return certificate;
  }

  await db
    .collection(CERTIFICATES_COLLECTION)
    .doc(certificate.id)
    .set(safePatch, {
      merge: true,
    });

  return {
    ...certificate,
    ...safePatch,
  };
};

/*
 * =====================================================
 * GERAR CERTIFICADO
 * =====================================================
 */

export const generateCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    const enrollmentId = req.params.enrollmentId;

    if (typeof enrollmentId !== "string" || !enrollmentId.trim()) {
      return res.status(400).json({
        message: "O ID da matrícula é obrigatório.",
      });
    }

    /*
     * ==============================
     * MATRÍCULA
     * ==============================
     */

    const enrollmentRef = db
      .collection(ENROLLMENTS_COLLECTION)
      .doc(enrollmentId);

    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return res.status(404).json({
        message: "Matrícula não encontrada.",
      });
    }

    const enrollment = {
      ...(enrollmentDoc.data() as Omit<IEnrollment, "id">),

      id: enrollmentDoc.id,
    } as IEnrollment & {
      id: string;
    };

    if (enrollment.userId !== userId) {
      return res.status(403).json({
        message: "Você não possui permissão para gerar este certificado.",
      });
    }

    if (enrollment.status !== "concluido") {
      return res.status(400).json({
        message:
          "O certificado só pode ser emitido após a conclusão da trilha.",
      });
    }

    /*
     * Monta os dados ANTES da transaction.
     *
     * A transaction fica responsável apenas
     * por impedir certificado duplicado.
     */

    const source = await buildCertificateSourceData(enrollment, userId);

    const certificateEnrollmentRef = db
      .collection(CERTIFICATE_ENROLLMENTS_COLLECTION)
      .doc(enrollmentId);

    /*
     * ==============================
     * EMISSÃO
     * ==============================
     */

    const result = await db.runTransaction<CertificateTransactionResult>(
      async (tx) => {
        const mappingDoc = await tx.get(certificateEnrollmentRef);

        /*
         * ==============================
         * JÁ EXISTE
         * ==============================
         */

        if (mappingDoc.exists) {
          const certificateId = mappingDoc.data()?.certificateId;

          if (typeof certificateId !== "string" || !certificateId.trim()) {
            throw Object.assign(
              new Error("O registro do certificado existente está inválido."),
              {
                status: 500,
              },
            );
          }

          const certificateRef = db
            .collection(CERTIFICATES_COLLECTION)
            .doc(certificateId);

          const certificateDoc = await tx.get(certificateRef);

          if (!certificateDoc.exists) {
            throw Object.assign(
              new Error("O certificado registrado não foi encontrado."),
              {
                status: 404,
              },
            );
          }

          const certificate: ICertificate = {
            ...(certificateDoc.data() as Omit<ICertificate, "id">),

            id: certificateDoc.id,
          };

          return {
            certificate,
            created: false,
          };
        }

        /*
         * ==============================
         * NOVO CERTIFICADO
         * ==============================
         */

        const certificateRef = db.collection(CERTIFICATES_COLLECTION).doc();

        const certificate: ICertificate = {
          id: certificateRef.id,

          enrollmentId: enrollment.id,

          userId,

          trailId: enrollment.trailId,

          userName: source.userName,

          trailTitle: source.trailTitle,

          totalModules: source.totalModules,

          totalLessons: source.totalLessons,

          program: source.program,

          status: "valido",

          issuedAt: Timestamp.now(),
        };

        if (source.workloadHours !== undefined) {
          certificate.workloadHours = source.workloadHours;
        }

        if (source.workloadMinutes !== undefined) {
          certificate.workloadMinutes = source.workloadMinutes;
        }

        if (source.startedAt) {
          certificate.startedAt = source.startedAt;
        }

        if (source.completedAt) {
          certificate.completedAt = source.completedAt;
        }

        const safeCertificate = removeUndefined(certificate);

        tx.set(certificateRef, safeCertificate);

        tx.set(certificateEnrollmentRef, {
          enrollmentId,

          certificateId: certificateRef.id,

          userId,

          trailId: enrollment.trailId,

          createdAt: Timestamp.now(),
        });

        return {
          certificate: safeCertificate,

          created: true,
        };
      },
    );

    /*
     * Certificados antigos também são
     * corrigidos quando o usuário tenta
     * gerar novamente.
     */

    const certificate = result.created
      ? result.certificate
      : await hydrateLegacyCertificate(result.certificate);

    return res.status(result.created ? 201 : 200).json({
      message: result.created
        ? "Certificado emitido com sucesso."
        : "Esta matrícula já possui um certificado.",

      certificate,
    });
  } catch (err) {
    console.error("Erro ao gerar certificado:", err);

    const status =
      err instanceof Error &&
      "status" in err &&
      typeof (
        err as Error & {
          status?: number;
        }
      ).status === "number"
        ? (
            err as Error & {
              status: number;
            }
          ).status
        : 500;

    return res.status(status).json({
      message:
        err instanceof Error ? err.message : "Erro ao gerar certificado.",
    });
  }
};

/*
 * =====================================================
 * VALIDAR CERTIFICADO
 * ROTA PÚBLICA
 * =====================================================
 */

export const validateCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const certificateId = req.params.id;

    if (typeof certificateId !== "string" || !certificateId.trim()) {
      return res.status(400).json({
        valid: false,

        message: "O ID do certificado é obrigatório.",
      });
    }

    const certificateDoc = await db
      .collection(CERTIFICATES_COLLECTION)
      .doc(certificateId)
      .get();

    if (!certificateDoc.exists) {
      return res.status(404).json({
        valid: false,

        message: "Certificado não encontrado.",
      });
    }

    let certificate: ICertificate = {
      ...(certificateDoc.data() as Omit<ICertificate, "id">),

      id: certificateDoc.id,
    };

    certificate = await hydrateLegacyCertificate(certificate);

    const publicCertificate = {
      id: certificate.id,

      userName: certificate.userName,

      trailTitle: certificate.trailTitle,

      workloadHours: certificate.workloadHours,

      workloadMinutes: certificate.workloadMinutes,

      totalModules: certificate.totalModules,

      totalLessons: certificate.totalLessons,

      program: certificate.program,

      startedAt: certificate.startedAt,

      completedAt: certificate.completedAt,

      issuedAt: certificate.issuedAt,

      status: certificate.status,

      ...(certificate.status === "revogado"
        ? {
            revokedAt: certificate.revokedAt,

            revocationReason: certificate.revocationReason,
          }
        : {}),
    };

    if (certificate.status === "revogado") {
      return res.status(200).json({
        valid: false,

        message: "Este certificado foi revogado.",

        certificate: publicCertificate,
      });
    }

    return res.status(200).json({
      valid: true,

      message: "Certificado válido.",

      certificate: publicCertificate,
    });
  } catch (err) {
    console.error("Erro ao validar certificado:", err);

    return res.status(500).json({
      valid: false,

      message: "Erro ao validar certificado.",
    });
  }
};

/*
 * =====================================================
 * BUSCAR CERTIFICADO DO USUÁRIO
 * =====================================================
 */

export const getCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const certificateId = req.params.id;

    const userId = req.user.uid;

    if (!certificateId) {
      return res.status(400).json({
        message: "O ID do certificado é obrigatório.",
      });
    }

    const certificateDoc = await db
      .collection(CERTIFICATES_COLLECTION)
      .doc(certificateId)
      .get();

    if (!certificateDoc.exists) {
      return res.status(404).json({
        message: "Certificado não encontrado.",
      });
    }

    let certificate: ICertificate = {
      ...(certificateDoc.data() as Omit<ICertificate, "id">),

      id: certificateDoc.id,
    };

    if (certificate.userId !== userId) {
      return res.status(403).json({
        message: "Você não possui permissão para acessar este certificado.",
      });
    }

    certificate = await hydrateLegacyCertificate(certificate);

    return res.status(200).json({
      certificate,
    });
  } catch (err) {
    console.error("Erro ao buscar certificado:", err);

    return res.status(500).json({
      message: "Erro ao buscar certificado.",
    });
  }
};

/*
 * =====================================================
 * LISTAR CERTIFICADOS DO USUÁRIO
 * =====================================================
 */

export const getMyCertificates = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    const userId = req.user.uid;

    const snapshot = await db
      .collection(CERTIFICATES_COLLECTION)
      .where("userId", "==", userId)
      .orderBy("issuedAt", "desc")
      .get();

    const certificates = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const certificate: ICertificate = {
          ...(doc.data() as Omit<ICertificate, "id">),

          id: doc.id,
        };

        return hydrateLegacyCertificate(certificate);
      }),
    );

    return res.status(200).json({
      certificates,
    });
  } catch (err) {
    console.error("Erro ao buscar certificados:", err);

    return res.status(500).json({
      message: "Erro ao buscar certificados.",
    });
  }
};
