import { Router } from "express";

import {
  incrementGamePlayers,
  getAvailableGames,
  getMyGameStats,
  getAvailableGameById,
} from "./game.controller";
import { completeGameSession, startGameSession } from "./game-session.controller";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const GamesRouter = Router();

GamesRouter.patch("/:id/access", incrementGamePlayers);

GamesRouter.post("/:id/session", verifyFirebaseToken, startGameSession);
GamesRouter.post("/:id/session/:sessionId/complete", verifyFirebaseToken, completeGameSession);
GamesRouter.post("/:id/complete", verifyFirebaseToken, completeGameSession);

GamesRouter.get("/", getAvailableGames);

GamesRouter.get("/stats/me", verifyFirebaseToken, getMyGameStats);

GamesRouter.get("/:id", getAvailableGameById);
