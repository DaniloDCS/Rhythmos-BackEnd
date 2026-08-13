import type { Request, Response } from "express";
import { db } from "../config/firebase";

type DashboardCounts = {
  users: {
    total: number;
  };

  trails: {
    total: number;
    active: number;
    draft: number;
  };

  support: {
    total: number;
    open: number;
    inProgress: number;
    waitingUser: number;
    resolved: number;
    closed: number;
  };

  games: {
    total: number;
    enabled: number;
    disabled: number;
  };

  knowledge: {
    total: number;
    published: number;
    draft: number;
  };

  laboratory: {
    total: number;
    enabled: number;
    disabled: number;
  };

  levels: {
    total: number;
    active: number;
    inactive: number;
  };

  rewards: {
    total: number;
    active: number;
    inactive: number;
    featured: number;
  };

  clinical: {
    total: number;
    published: number;
    draft: number;
    completions: number;
  };

  xpRules: {
    total: number;
    active: number;
    inactive: number;
  };

  updatedAt: string;
};

const safeSize = (snap: FirebaseFirestore.QuerySnapshot) => snap.size ?? 0;

export const getAdminDashboard = async (_: Request, res: Response) => {
  try {
    const usersRef = db.collection("users");
    const trailsRef = db.collection("trails");
    const supportRef = db.collection("supports");
    const gamesRef = db.collection("games");
    const knowledgeRef = db.collection("knowledge");

    // Clinical
    const clinicalRef = db.collection("clinical_cases");

    const labRef = db.collection("laboratory");
    const levelsRef = db.collection("levels");
    const rewardsRef = db.collection("rewards");
    const xpRulesRef = db.collection("xpRules");

    const [
      // Usuários
      usersTotal,

      // Trilhas
      trailsTotal,
      trailsActive,
      trailsDraft,

      // Suporte
      supportTotal,
      supportOpen,
      supportInProgress,
      supportWaitingUser,
      supportResolved,
      supportClosed,

      // Jogos
      gamesTotal,
      gamesEnabled,
      gamesDisabled,

      // Conhecimento
      knowledgeTotal,
      knowledgePublished,
      knowledgeDraft,

      // Laboratório
      labTotal,
      labEnabled,
      labDisabled,

      // Níveis
      levelsTotal,
      levelsActive,
      levelsInactive,

      // Recompensas
      rewardsTotal,
      rewardsActive,
      rewardsInactive,
      rewardsFeatured,

      // Clinical
      clinicalTotal,
      clinicalPublished,
      clinicalDraft,

      // Regras de XP
      xpRulesTotal,
      xpRulesActive,
      xpRulesInactive,
    ] = await Promise.all([
      // Usuários
      usersRef.get(),

      // Trilhas
      trailsRef.get(),
      trailsRef.where("published", "==", true).get(),
      trailsRef.where("status", "==", "Em construção").get(),

      // Suporte
      supportRef.get(),
      supportRef.where("status", "==", "Aberto").get(),
      supportRef.where("status", "==", "Em andamento").get(),
      supportRef.where("status", "==", "Aguardando usuário").get(),
      supportRef.where("status", "==", "Resolvido").get(),
      supportRef.where("status", "==", "Fechado").get(),

      // Jogos
      gamesRef.get(),
      gamesRef.where("visible", "==", true).get(),
      gamesRef.where("visible", "==", false).get(),

      // Conhecimento
      knowledgeRef.get(),
      knowledgeRef.where("status", "==", "published").get(),
      knowledgeRef.where("status", "==", "draft").get(),

      // Laboratório
      labRef.get(),
      labRef.where("enabled", "==", true).get(),
      labRef.where("enabled", "==", false).get(),

      // Níveis
      levelsRef.get(),
      levelsRef.where("active", "==", true).get(),
      levelsRef.where("active", "==", false).get(),

      // Recompensas
      rewardsRef.get(),
      rewardsRef.where("active", "==", true).get(),
      rewardsRef.where("active", "==", false).get(),
      rewardsRef.where("featured", "==", true).get(),

      // Clinical
      clinicalRef.get(),
      clinicalRef.where("status", "==", "publicado").get(),
      clinicalRef.where("status", "==", "rascunho").get(),

      // Regras de XP
      xpRulesRef.get(),
      xpRulesRef.where("active", "==", true).get(),
      xpRulesRef.where("active", "==", false).get(),
    ]);

    /*
     * ========================================
     * CLINICAL
     * ========================================
     *
     * Cada caso possui:
     *
     * metrics: {
     *   attempts,
     *   correctAttempts,
     *   completions
     * }
     *
     * Portanto somamos as conclusões de todos
     * os casos cadastrados.
     */
    const clinicalCompletions = clinicalTotal.docs.reduce((total, doc) => {
      const data = doc.data();

      return total + Number(data.metrics?.completions ?? 0);
    }, 0);

    const payload: DashboardCounts = {
      users: {
        total: safeSize(usersTotal),
      },

      trails: {
        total: safeSize(trailsTotal),
        active: safeSize(trailsActive),
        draft: safeSize(trailsDraft),
      },

      support: {
        total: safeSize(supportTotal),
        open: safeSize(supportOpen),
        inProgress: safeSize(supportInProgress),
        waitingUser: safeSize(supportWaitingUser),
        resolved: safeSize(supportResolved),
        closed: safeSize(supportClosed),
      },

      games: {
        total: safeSize(gamesTotal),
        enabled: safeSize(gamesEnabled),
        disabled: safeSize(gamesDisabled),
      },

      knowledge: {
        total: safeSize(knowledgeTotal),
        published: safeSize(knowledgePublished),
        draft: safeSize(knowledgeDraft),
      },

      laboratory: {
        total: safeSize(labTotal),
        enabled: safeSize(labEnabled),
        disabled: safeSize(labDisabled),
      },

      levels: {
        total: safeSize(levelsTotal),
        active: safeSize(levelsActive),
        inactive: safeSize(levelsInactive),
      },

      rewards: {
        total: safeSize(rewardsTotal),
        active: safeSize(rewardsActive),
        inactive: safeSize(rewardsInactive),
        featured: safeSize(rewardsFeatured),
      },

      clinical: {
        total: safeSize(clinicalTotal),
        published: safeSize(clinicalPublished),
        draft: safeSize(clinicalDraft),
        completions: clinicalCompletions,
      },

      xpRules: {
        total: safeSize(xpRulesTotal),
        active: safeSize(xpRulesActive),
        inactive: safeSize(xpRulesInactive),
      },

      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error("Erro ao buscar dashboard administrativo:", err);

    return res.status(500).json({
      error: "Erro ao buscar dados do dashboard",
    });
  }
};
