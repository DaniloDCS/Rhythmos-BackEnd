import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type {
  IUserProgress,
  IUserRewardProgress,
  IUserRewardSource,
  IUserUnlockedContent,
} from "../users/user-progress.types";
import type { IReward, RewardType } from "./reward.model";
import { userGamificationRef } from "../gamification/user-gamification.repository";

const REWARDS_COLLECTION = "rewards";

export interface RewardGrantRequest {
  rewardId: string;
  source: IUserRewardSource;
}

export interface GrantedReward {
  rewardId: string;
  name: string;
  type: RewardType;
  value?: string | null;
  source: IUserRewardSource;
}

export interface RewardGrantResult {
  progress: IUserProgress;
  granted: GrantedReward[];
}

export const withUnlockDefaults = (progress: IUserProgress): IUserProgress => ({
  ...progress,
  badges: [...(progress.badges ?? [])],
  rewards: [...(progress.rewards ?? [])],
  unlocked: {
    games: { ...(progress.unlocked?.games ?? {}) },
    trails: { ...(progress.unlocked?.trails ?? {}) },
    modules: { ...(progress.unlocked?.modules ?? {}) },
  },
});

const normalizeRequests = (
  requests: RewardGrantRequest[],
): RewardGrantRequest[] => {
  const seen = new Set<string>();
  const normalized: RewardGrantRequest[] = [];

  for (const request of requests) {
    const rewardId = request.rewardId?.trim();
    if (!rewardId) continue;

    const key = [rewardId, request.source.type, request.source.id ?? ""].join(
      ":",
    );

    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push({
      ...request,
      rewardId,
    });
  }

  return normalized;
};

const unlockInfo = (
  rewardId: string,
  source: IUserRewardSource,
  unlockedAt: string,
): IUserUnlockedContent => ({
  rewardId,
  source,
  unlockedAt,
});

export const grantRewardsInTransaction = async (
  transaction: Transaction,
  progress: IUserProgress,
  requests: RewardGrantRequest[],
): Promise<RewardGrantResult> => {
  const normalized = normalizeRequests(requests);

  if (!normalized.length) {
    return {
      progress: withUnlockDefaults(progress),
      granted: [],
    };
  }

  const snapshots = await Promise.all(
    normalized.map((request) =>
      transaction.get(db.collection(REWARDS_COLLECTION).doc(request.rewardId)),
    ),
  );
  const badgeIds = snapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => snapshot.data() as IReward)
    .filter((reward) => reward.type === "badge" && Boolean(reward.value?.trim()))
    .map((reward) => reward.value!.trim());
  const badgeSnapshots = await Promise.all(
    [...new Set(badgeIds)].map((badgeId) =>
      transaction.get(db.collection("badges").doc(badgeId)),
    ),
  );
  const badgesById = new Map(
    badgeSnapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => [snapshot.id, snapshot.data()!]),
  );

  const nextProgress = withUnlockDefaults(progress);
  const granted: GrantedReward[] = [];

  for (let index = 0; index < normalized.length; index++) {
    const request = normalized[index];
    const snapshot = snapshots[index];

    if (!snapshot.exists) continue;

    const reward: IReward = {
      id: snapshot.id,
      ...(snapshot.data() as Omit<IReward, "id">),
    };

    if (!reward.active) continue;

    const alreadyGranted = nextProgress.rewards.some(
      (item) => item.rewardId === snapshot.id,
    );

    const alreadyGrantedFromSameSource = nextProgress.rewards.some(
      (item) =>
        item.rewardId === snapshot.id &&
        item.source?.type === request.source.type &&
        (item.source?.id ?? null) === (request.source.id ?? null),
    );

    const shouldRecordHistory =
      reward.repeatable === true
        ? !alreadyGrantedFromSameSource
        : !alreadyGranted;

    const value = reward.value?.trim() ?? "";
    const grantedAt = new Date().toISOString();

    switch (reward.type) {
      case "unlock_game": {
        if (!value) continue;

        if (!nextProgress.unlocked.games[value]) {
          nextProgress.unlocked.games[value] = unlockInfo(
            snapshot.id,
            request.source,
            grantedAt,
          );
        }
        break;
      }

      case "unlock_trail": {
        if (!value) continue;

        if (!nextProgress.unlocked.trails[value]) {
          nextProgress.unlocked.trails[value] = unlockInfo(
            snapshot.id,
            request.source,
            grantedAt,
          );
        }
        break;
      }

      case "unlock_module": {
        if (!value) continue;

        if (!nextProgress.unlocked.modules[value]) {
          nextProgress.unlocked.modules[value] = unlockInfo(
            snapshot.id,
            request.source,
            grantedAt,
          );
        }
        break;
      }

      case "badge": {
        if (!value) continue;
        const badge = badgesById.get(value);
        if (!badge || badge.active === false) continue;
        if (!nextProgress.badges.some((item) => item.badgeId === value)) {
          nextProgress.badges.push({
            badgeId: value,
            name: String(badge.name ?? reward.name),
            unlockedAt: grantedAt,
          });
        }
        break;
      }
      case "title":
      case "theme":
      case "xp_bonus":
      case "special_content":
      case "other":
        break;

      default:
        break;
    }

    if (!shouldRecordHistory) {
      continue;
    }

    const historyItem: IUserRewardProgress = {
      rewardId: snapshot.id,
      name: reward.name,
      type: reward.type,
      value: reward.value ?? null,
      grantedAt,
      source: request.source,
    };

    nextProgress.rewards.push(historyItem);

    granted.push({
      rewardId: snapshot.id,
      name: reward.name,
      type: reward.type,
      value: reward.value ?? null,
      source: request.source,
    });
  }

  return {
    progress: nextProgress,
    granted,
  };
};

export const grantRewardsToUser = async (
  userId: string,
  requests: RewardGrantRequest[],
): Promise<RewardGrantResult> => {
  const progressRef = userGamificationRef(userId);

  return db.runTransaction(async (transaction) => {
    const progressDoc = await transaction.get(progressRef);

    if (!progressDoc.exists) {
      throw new Error("PROGRESS_NOT_FOUND");
    }

    const progress = progressDoc.data() as IUserProgress;

    const result = await grantRewardsInTransaction(
      transaction,
      progress,
      requests,
    );

    transaction.set(
      progressRef,
      {
        badges: result.progress.badges,
        rewards: result.progress.rewards,
        unlocked: result.progress.unlocked,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

    return result;
  });
};
