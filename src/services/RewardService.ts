import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import type {
  IUserProgress,
  IUserRewardProgress,
  IUserRewardSource,
  IUserUnlockedContent,
} from "../interfaces/IUserProgress";
import type { IReward, RewardType } from "../models/Rewards";

const REWARDS_COLLECTION = "rewards";
const USER_PROGRESS_COLLECTION = "user_progress";

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

export const withUnlockDefaults = (
  progress: IUserProgress,
): IUserProgress => ({
  ...progress,
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

    /*
     * Mantemos a origem no identificador porque uma recompensa
     * repetível pode ser concedida por eventos distintos no mesmo fluxo.
     */
    const key = [
      rewardId,
      request.source.type,
      request.source.id ?? "",
    ].join(":");

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

  /*
   * Todas as leituras das recompensas acontecem antes de qualquer escrita.
   * O serviço não escreve no Firestore; ele devolve o novo estado para o
   * controller persistir dentro da mesma transaction.
   */
  const snapshots = await Promise.all(
    normalized.map((request) =>
      transaction.get(db.collection(REWARDS_COLLECTION).doc(request.rewardId)),
    ),
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

    /*
     * Não repetível: basta já ter recebido o reward uma vez.
     * Repetível: pode voltar a ser concedido por outro evento/origem,
     * mas não deve ser duplicado pelas sincronizações idempotentes
     * do mesmo nível/aula.
     */
    const shouldRecordHistory =
      reward.repeatable === true
        ? !alreadyGrantedFromSameSource
        : !alreadyGranted;

    const value = reward.value?.trim() ?? "";
    const grantedAt = new Date().toISOString();

    /*
     * Aplicamos primeiro os efeitos idempotentes de desbloqueio.
     * Isso também repara documentos antigos que já tenham o rewardId
     * no histórico, mas ainda não possuam o mapa `unlocked`.
     */
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

      /*
       * Os demais tipos continuam registrados no histórico. Os efeitos de
       * badge/title/theme/xp_bonus podem ser plugados aqui posteriormente
       * sem mudar a forma como níveis e aulas concedem recompensas.
       */
      case "badge":
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

/**
 * Conveniência para eventos que não já estejam dentro de uma transaction.
 */
export const grantRewardsToUser = async (
  userId: string,
  requests: RewardGrantRequest[],
): Promise<RewardGrantResult> => {
  const progressRef = db.collection(USER_PROGRESS_COLLECTION).doc(userId);

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
        rewards: result.progress.rewards,
        unlocked: result.progress.unlocked,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

    return result;
  });
};
