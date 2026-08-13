import { Router } from "express";

import {
  createLevel,
  getAllLevelsAdmin,
  getLevelByIdAdmin,
  updateLevelAdmin,
  activateLevelAdmin,
  deactivateLevelAdmin,
  deleteLevelAdmin,
  getActiveLevels,
  getLevelByXp,
} from "../controllers/Levels.controller";

const router = Router();

/* =========================================================
   ADMIN
========================================================= */

router.post("/admin/levels", createLevel);

router.get("/admin/levels", getAllLevelsAdmin);

router.get("/admin/levels/:id", getLevelByIdAdmin);

/*
 * Atualização completa.
 */
router.put("/admin/levels/:id", updateLevelAdmin);

/*
 * Atualização parcial.
 *
 * IMPORTANTE:
 * O frontend utiliza PATCH tanto na edição
 * quanto na ativação/desativação rápida.
 */
router.patch("/admin/levels/:id", updateLevelAdmin);

router.patch("/admin/levels/:id/activate", activateLevelAdmin);

router.patch("/admin/levels/:id/deactivate", deactivateLevelAdmin);

router.delete("/admin/levels/:id", deleteLevelAdmin);

/* =========================================================
   PUBLIC
========================================================= */

router.get("/levels", getActiveLevels);

router.get("/levels/by-xp", getLevelByXp);

export default router;
