import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type {
  RhythmSketchChallenge,
  RhythmSketchPoint,
  RhythmSketchStoredChallenge,
  RhythmSketchValidationResult,
} from "./rhythm-sketch.types";
import { RHYTHM_SKETCH_IDS, RHYTHM_SKETCH_RULES } from "./rhythm-sketch.rules";
import { validateRhythmSketch } from "./rhythm-sketch.validator";

const CHALLENGES_COLLECTION = "rhythm_sketch_challenges";

const ATTEMPTS_COLLECTION = "rhythm_sketch_attempts";

const CHALLENGE_TTL_MINUTES = 30;
const MAX_ATTEMPTS = 3;

export interface RhythmSketchValidationWithAttempt
  extends RhythmSketchValidationResult {
  attempt: number;
}

export class RhythmSketchService {
  async createChallenge(userId: string): Promise<RhythmSketchChallenge> {
    const rhythmId =
      RHYTHM_SKETCH_IDS[Math.floor(Math.random() * RHYTHM_SKETCH_IDS.length)];

    const rule = RHYTHM_SKETCH_RULES[rhythmId];

    const ref = db.collection(CHALLENGES_COLLECTION).doc();

    const now = Timestamp.now();

    const expiresAt = Timestamp.fromMillis(
      now.toMillis() + CHALLENGE_TTL_MINUTES * 60 * 1000,
    );

    const stored: RhythmSketchStoredChallenge = {
      id: ref.id,
      userId,
      rhythmId,
      lead: rule.lead,
      createdAt: now,
      expiresAt,
      attempts: 0,
    };

    await ref.set(stored);

    return {
      id: ref.id,
      rhythmId,
      rhythmName: rule.name,
      lead: rule.lead,
      minCycles: rule.minCycles,
      durationSeconds: rule.durationSeconds,
      instructions: rule.instructions,
      expiresAt: expiresAt.toDate().toISOString(),
    };
  }

  async validate(
    userId: string,
    challengeId: string,
    points: RhythmSketchPoint[],
  ): Promise<RhythmSketchValidationWithAttempt> {
    if (!challengeId?.trim()) {
      throw new Error("RHYTHM_SKETCH_CHALLENGE_REQUIRED");
    }

    if (!Array.isArray(points)) {
      throw new Error("RHYTHM_SKETCH_POINTS_REQUIRED");
    }

    if (points.length > 12_000) {
      throw new Error("RHYTHM_SKETCH_TOO_MANY_POINTS");
    }

    const challengeRef = db.collection(CHALLENGES_COLLECTION).doc(challengeId);

    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      throw new Error("RHYTHM_SKETCH_CHALLENGE_NOT_FOUND");
    }

    const challenge = challengeDoc.data() as RhythmSketchStoredChallenge;

    if (challenge.userId !== userId) {
      throw new Error("RHYTHM_SKETCH_CHALLENGE_FORBIDDEN");
    }

    if (challenge.completedAt) {
      throw new Error("RHYTHM_SKETCH_CHALLENGE_COMPLETED");
    }

    if (Number(challenge.attempts ?? 0) >= MAX_ATTEMPTS) {
      throw new Error("RHYTHM_SKETCH_MAX_ATTEMPTS");
    }

    const expiresAt =
      challenge.expiresAt instanceof Timestamp ? challenge.expiresAt : null;

    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      throw new Error("RHYTHM_SKETCH_CHALLENGE_EXPIRED");
    }

    const rule = RHYTHM_SKETCH_RULES[challenge.rhythmId];

    if (!rule) {
      throw new Error("RHYTHM_SKETCH_RULE_NOT_FOUND");
    }

    const result = validateRhythmSketch(points, rule);

    const attemptRef = db.collection(ATTEMPTS_COLLECTION).doc();

    const nextAttempt = Number(challenge.attempts ?? 0) + 1;

    const batch = db.batch();

    batch.set(attemptRef, {
      id: attemptRef.id,
      userId,
      challengeId,
      rhythmId: challenge.rhythmId,
      rhythmName: rule.name,
      lead: rule.lead,
      score: result.score,
      passed: result.passed,
      perfect: result.perfect,
      breakdown: result.breakdown,
      features: result.features,

      pointsCount: points.length,
      attempt: nextAttempt,
      createdAt: Timestamp.now(),
    });

    batch.set(
      challengeRef,
      {
        attempts: FieldValue.increment(1),
        lastAttemptAt: Timestamp.now(),
        ...(result.passed
          ? {
              completedAt: Timestamp.now(),
            }
          : {}),
      },
      {
        merge: true,
      },
    );

    await batch.commit();

    return {
      ...result,
      attempt: nextAttempt,
    };
  }
}

export const rhythmSketchService = new RhythmSketchService();
