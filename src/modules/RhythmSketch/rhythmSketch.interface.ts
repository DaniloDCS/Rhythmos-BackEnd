export type RhythmSketchRhythmId =
  | "sinus_normal"
  | "sinus_bradycardia"
  | "sinus_tachycardia"
  | "atrial_fibrillation"
  | "ventricular_tachycardia";

export type RhythmSketchLead = "DII";

export interface RhythmSketchPoint {
  x: number;
  y: number;
}

export interface RhythmSketchChallenge {
  id: string;
  rhythmId: RhythmSketchRhythmId;
  rhythmName: string;
  lead: RhythmSketchLead;
  minCycles: number;
  durationSeconds: number;
  instructions: string[];
  expiresAt: string;
}

export interface RhythmSketchValidationRequest {
  challengeId: string;
  points: RhythmSketchPoint[];
}

export interface RhythmSketchValidationBreakdown {
  structure: number;
  timing: number;
  morphology: number;
  consistency: number;
}

export interface RhythmSketchDetectedFeatures {
  coverage: number;
  samples: number;
  detectedCycles: number;
  expectedCycles: number;
  regularityCv: number;
  dominantPeakCount: number;
  amplitude: number;
}

export interface RhythmSketchFeedbackItem {
  type: "success" | "warning" | "error" | "info";
  label: string;
  detail: string;
}

export interface RhythmSketchValidationResult {
  score: number;
  passed: boolean;
  perfect: boolean;
  breakdown: RhythmSketchValidationBreakdown;
  features: RhythmSketchDetectedFeatures;
  feedback: RhythmSketchFeedbackItem[];
  referencePoints: RhythmSketchPoint[];
}

export interface RhythmSketchRule {
  id: RhythmSketchRhythmId;
  name: string;
  lead: RhythmSketchLead;
  minCycles: number;
  durationSeconds: number;

  expectedCycles: {
    min: number;
    max: number;
    ideal: number;
  };

  regularity:
    | "regular"
    | "irregularly_irregular";

  pWave: "present" | "absent";
  qrs: "narrow" | "wide";
  rateLabel: "normal" | "slow" | "fast";

  instructions: string[];
}

export interface RhythmSketchStoredChallenge {
  id: string;
  userId: string;
  rhythmId: RhythmSketchRhythmId;
  lead: RhythmSketchLead;
  createdAt: unknown;
  expiresAt: unknown;
  attempts: number;
  lastAttemptAt?: unknown;
  completedAt?: unknown;
}
