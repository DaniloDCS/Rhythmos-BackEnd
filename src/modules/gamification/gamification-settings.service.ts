import { db } from "../../config/firebase";
import type { GamificationSettings, RankingSettings } from "./gamification.types";
import { rankingScore } from "./gamification.math";

export const GAMIFICATION_SETTINGS_COLLECTION = "gamification_settings";
export const GLOBAL_SETTINGS_DOCUMENT = "global";

export const getGamificationSettings = async (): Promise<GamificationSettings> => {
  const snapshot = await db
    .collection(GAMIFICATION_SETTINGS_COLLECTION)
    .doc(GLOBAL_SETTINGS_DOCUMENT)
    .get();
  if (!snapshot.exists) {
    throw new Error("GAMIFICATION_SETTINGS_NOT_CONFIGURED");
  }
  return snapshot.data() as GamificationSettings;
};

export const calculateRankingScore = (
  progress: FirebaseFirestore.DocumentData,
  settings: RankingSettings,
) => rankingScore(progress, settings);
