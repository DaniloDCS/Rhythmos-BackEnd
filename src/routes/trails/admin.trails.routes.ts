// // import { Router } from "express";
// // import { withAdmin } from "../../middlewares/withAdmin";
// // import {
// //   createTrail,
// //   deleteTrailAdmin,
// //   getAllTrailsAdmin,
// //   getTrailByIdAdmin,
// //   publishTrailAdmin,
// //   updateTrailAdmin,
// //   getModulesByTrail,
// //   getCompleteTrailByIdAdmin,
// //   simpleUpdateTrailAdmin,
// //   getCompleteTrailsAdmin,
// // } from "../../controllers/Trails.controller";

// // export const AdminTrailsRoutes = Router();

// // AdminTrailsRoutes.route("/trails")
// //   .post(...withAdmin(createTrail))
// //   // .get(...withAdmin(getAllTrailsAdmin))
// //   .get(...withAdmin(getCompleteTrailsAdmin));

// // AdminTrailsRoutes.route("/trail/modules/:trailId").get(
// //   ...withAdmin(getModulesByTrail),
// // );

// // AdminTrailsRoutes.route("/trail/update/:id").patch(
// //   ...withAdmin(simpleUpdateTrailAdmin),
// // );

// // AdminTrailsRoutes.route("/trail/:id")
// //   .get(...withAdmin(getCompleteTrailByIdAdmin))
// //   // .get(...withAdmin(getTrailByIdAdmin))
// //   .put(...withAdmin(updateTrailAdmin))
// //   .delete(...withAdmin(deleteTrailAdmin));

// // AdminTrailsRoutes.patch("/trails/:id/publish", ...withAdmin(publishTrailAdmin));

// import { Router } from "express";
// import { withAdmin } from "../../middlewares/withAdmin";
// import {
//   createTrail,
//   deleteTrailAdmin,
//   getAllTrailsAdmin,
//   getTrailByIdAdmin,
//   publishTrailAdmin,
//   updateTrailAdmin,
//   getModulesByTrail,
//   getCompleteTrailByIdAdmin,
//   simpleUpdateTrailAdmin,
//   getCompleteTrailsAdmin,
//   getTrailAnalyticsAdmin,
// } from "../../controllers/Trails.controller";

// export const AdminTrailsRoutes = Router();

// AdminTrailsRoutes.route("/trails")
//   .post(...withAdmin(createTrail))
//   // .get(...withAdmin(getAllTrailsAdmin))
//   .get(...withAdmin(getCompleteTrailsAdmin));

// AdminTrailsRoutes.get(
//   "/trails/:id/analytics",
//   ...withAdmin(getTrailAnalyticsAdmin),
// );

// AdminTrailsRoutes.route("/trail/modules/:trailId").get(
//   ...withAdmin(getModulesByTrail),
// );

// AdminTrailsRoutes.route("/trail/update/:id").patch(
//   ...withAdmin(simpleUpdateTrailAdmin),
// );

// AdminTrailsRoutes.route("/trail/:id")
//   .get(...withAdmin(getCompleteTrailByIdAdmin))
//   // .get(...withAdmin(getTrailByIdAdmin))
//   .put(...withAdmin(updateTrailAdmin))
//   .delete(...withAdmin(deleteTrailAdmin));

// AdminTrailsRoutes.patch("/trails/:id/publish", ...withAdmin(publishTrailAdmin));

import { Router } from "express";
import { withAdmin } from "../../middlewares/withAdmin";
import {
  createTrail,
  deleteTrailAdmin,
  publishTrailAdmin,
  updateTrailAdmin,
  getModulesByTrail,
  getCompleteTrailByIdAdmin,
  simpleUpdateTrailAdmin,
  getCompleteTrailsAdmin,
  getTrailAnalyticsAdmin,
} from "../../controllers/Trails.controller";

export const AdminTrailsRoutes = Router();

AdminTrailsRoutes.route("/trails")
  .post(...withAdmin(createTrail))
  .get(...withAdmin(getCompleteTrailsAdmin));

AdminTrailsRoutes.get(
  "/trails/:id/analytics",
  ...withAdmin(getTrailAnalyticsAdmin),
);

AdminTrailsRoutes.get(
  "/trail/modules/:trailId",
  ...withAdmin(getModulesByTrail),
);

AdminTrailsRoutes.patch(
  "/trail/update/:id",
  ...withAdmin(simpleUpdateTrailAdmin),
);

AdminTrailsRoutes.route("/trail/:id")
  .get(...withAdmin(getCompleteTrailByIdAdmin))
  .put(...withAdmin(updateTrailAdmin))
  .delete(...withAdmin(deleteTrailAdmin));

AdminTrailsRoutes.patch("/trails/:id/publish", ...withAdmin(publishTrailAdmin));
