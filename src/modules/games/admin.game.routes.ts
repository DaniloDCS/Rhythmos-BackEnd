import { Router } from "express";

import {
  createGame,
  getAllGamesAdmin,
  getGameByIdAdmin,
  updateGameAdmin,
  deleteGameAdmin,
} from "./admin.game.controller";

import { verifyFirebaseToken } from "../../middlewares/auth.middleware";

import { requireAdmin } from "../../middlewares/admin.middleware";

export const AdminGameRoutes = Router();

AdminGameRoutes.post("/", verifyFirebaseToken, requireAdmin, createGame);

AdminGameRoutes.get("", verifyFirebaseToken, requireAdmin, getAllGamesAdmin);

AdminGameRoutes.get(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  getGameByIdAdmin,
);

AdminGameRoutes.put("/:id", verifyFirebaseToken, requireAdmin, updateGameAdmin);

AdminGameRoutes.patch(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateGameAdmin,
);

AdminGameRoutes.delete(
  "/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteGameAdmin,
);
