// import { Router } from "express";

// import {
//   createModule,
//   getAllModules,
//   getModulesByTrail,
//   updateModule,
//   // publishModule,
//   // unpublishModule,
//   // archiveModule,
//   // unarchiveModule,
//   deleteModule,
//   getLessonsByModule,
// } from "../../controllers/Module.controller";

// export const AdminModulesRoutes = Router();

// AdminModulesRoutes.get("/modules/trails/:trailId/modules", getModulesByTrail);

// AdminModulesRoutes.get("/module/lessons/:id", getLessonsByModule);

// AdminModulesRoutes.get("/modules", getAllModules);

// AdminModulesRoutes.post("/modules", createModule);

// AdminModulesRoutes.put("/modules/:id", updateModule);

// AdminModulesRoutes.patch("/modules/:id", updateModule);

// // AdminModulesRoutes.patch("/modules/:id/publish", publishModule);

// // AdminModulesRoutes.patch("/modules/:id/unpublish", unpublishModule);

// // AdminModulesRoutes.patch("/modules/:id/archive", archiveModule);

// // AdminModulesRoutes.patch("/modules/:id/unarchive", unarchiveModule);

// AdminModulesRoutes.delete("/modules/:id", deleteModule);

import { Router } from "express";
import {
  createModule,
  getAllModules,
  getModulesByTrail,
  updateModule,
  deleteModule,
  getLessonsByModule,
} from "../../controllers/Module.controller";
import { verifyFirebaseToken } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/adminMiddleware";

export const AdminModulesRoutes = Router();

AdminModulesRoutes.get(
  "/modules/trails/:trailId/modules",
  verifyFirebaseToken,
  requireAdmin,
  getModulesByTrail,
);

AdminModulesRoutes.get(
  "/module/lessons/:id",
  verifyFirebaseToken,
  requireAdmin,
  getLessonsByModule,
);

AdminModulesRoutes.get(
  "/modules",
  verifyFirebaseToken,
  requireAdmin,
  getAllModules,
);

AdminModulesRoutes.post(
  "/modules",
  verifyFirebaseToken,
  requireAdmin,
  createModule,
);

AdminModulesRoutes.put(
  "/modules/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateModule,
);

AdminModulesRoutes.patch(
  "/modules/:id",
  verifyFirebaseToken,
  requireAdmin,
  updateModule,
);

AdminModulesRoutes.delete(
  "/modules/:id",
  verifyFirebaseToken,
  requireAdmin,
  deleteModule,
);
