import { Router } from "express";
import {
  createGame,
  getAllGamesAdmin,
  getGameByIdAdmin,
  updateGameAdmin,
  deleteGameAdmin,
  incrementGamePlayers,
  getAvailableGames,
  getAvailableGameById,
  completeGame,
} from "../controllers/Games.controller";
import { verifyFirebaseToken } from "../middlewares/authMiddleware";
import { requireAdmin } from "../middlewares/adminMiddleware";

export const GamesRouter = Router();

/* =========================
   ADMIN
========================= */

GamesRouter.post("/admin/games", verifyFirebaseToken, requireAdmin, createGame);
GamesRouter.get(
  "/admin/games",
  verifyFirebaseToken,
  requireAdmin,
  getAllGamesAdmin,
);
GamesRouter.get(
  "/admin/games/:id",
  verifyFirebaseToken,
  requireAdmin,
  getGameByIdAdmin,
);
GamesRouter.put(
  "/admin/games/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateGameAdmin,
);
GamesRouter.patch(
  "/admin/games/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateGameAdmin,
);
GamesRouter.delete(
  "/admin/games/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteGameAdmin,
);

/* =========================
   GAMES
========================= */

GamesRouter.patch("/games/:id/access", incrementGamePlayers);
GamesRouter.post("/games/:id/complete", verifyFirebaseToken, completeGame);
GamesRouter.get("/games", getAvailableGames);
GamesRouter.get("/games/:id", getAvailableGameById);
