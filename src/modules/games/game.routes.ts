import { Router } from "express";

import {
  incrementGamePlayers,
  getAvailableGames,
  getAvailableGameById,
  completeGame,
} from "./game.controller";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

export const GamesRouter = Router();

GamesRouter.patch("/:id/access", incrementGamePlayers);

GamesRouter.post("/:id/complete", verifyFirebaseToken, completeGame);

GamesRouter.get("/", getAvailableGames);

GamesRouter.get("/:id", getAvailableGameById);
