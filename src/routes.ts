import { Router, Request, Response } from "express";

import crosswordRoutes from "./routes/Crosswords.routes";
import chatBotRhythms from "./routes/ChatBotRhythms.routes";
import Analytics from "./routes/Analytics.routes";
import Support from "./routes/Support.routes";
import Levels from "./routes/Levels.routes";

// import { createFullTrail } from "./teste";
import { GamesRouter } from "./routes/Games.routes";
import BadgesRoutes from "./routes/Badges.routes";
import RewardsRoutes from "./routes/Rewards.routes";

import { getAdminDashboard } from "./controllers/admin.controller";
import { AdminTrailsRoutes } from "./routes/trails/admin.trails.routes";
import { PublicTrailsRoutes } from "./routes/trails/public.trails.routes";
import { AdminUserRoutes } from "./routes/users/admin.user.routes";
import { UserRoutes } from "./routes/users/user.routes";
import { UserProgressRoutes } from "./routes/users/user.progress.routes";
import { AdminUserProgressRoutes } from "./routes/users/admin.user.progress.routes";
import { ModulesRoutes } from "./routes/modules/modules.routes";
import { AdminModulesRoutes } from "./routes/modules/admin.modules.routes";
import { getCompleteTrailByIdAdmin } from "./controllers/Trails.controller";
import { LessonsRoutes } from "./routes/lessons/lessons.routes";
import { AdminLessonsRoutes } from "./routes/lessons/admin.lessons.routes";
import { heatmapRouter } from "./modules/Heatmap/heatmap.routes";
import { timelineRouter } from "./modules/Timeline/timeline.routes";
import { EnrollmentsRoutes } from "./routes/trails/enrollment.routes";
import { CertificatesRoutes } from "./routes/trails/certificate.routes";
import KnowledgeRoutes from "./routes/Knowledge.routes";
import DashboardRoutes from "./routes/Dashboard.routes";
import { SketchbookRouter } from "./modules/Sketchbook";
import { RhythmSketchRouter } from "./modules/RhythmSketch";
import { ClinicalRoutes } from "./modules/Clinical";
import { PedagogicalAnalyticsRouter } from "./modules/PedagogicalAnalytics";
import { PollRoutes } from "./routes/learning/polls.routes";
import { AssessmentsRoutes } from "./routes/learning/assessments.routes";
import { AdminAssessmentsRoutes } from "./routes/learning/admin.assessments.routes";

const router = Router();

router.use("/", UserRoutes);

const adminRoutes = [
  AdminUserRoutes,
  AdminUserProgressRoutes,
  AdminTrailsRoutes,
  AdminModulesRoutes,
  AdminLessonsRoutes,
  AdminAssessmentsRoutes,
];

router.use(BadgesRoutes);

router.use(crosswordRoutes);
router.use(chatBotRhythms);

router.use(Analytics);
router.use(Support);

router.use(Levels);

router.use(RewardsRoutes);

// router.get("/create-trail/", createFullTrail);

/* A partir daqui está ok! */
// # Admin
router.use("/admin", ...adminRoutes);
router.use(DashboardRoutes);
router.use("/admin/dashboard", getAdminDashboard);

// # Trails
router.use("/trails", PublicTrailsRoutes);

// # Games
router.use(GamesRouter);
router.use(ClinicalRoutes);

router.use("/heatmap", heatmapRouter);
router.use("/sketchbook", SketchbookRouter);
router.use("/rhythm-sketch", RhythmSketchRouter);

// # Knowledge
router.use(KnowledgeRoutes);

// # Modules
router.use("/modules", ModulesRoutes);

// # Lessons
router.use("/lessons", LessonsRoutes);

// # Polls / Assessments
router.use("/polls", PollRoutes);
router.use("/assessments", AssessmentsRoutes);

// # Certificate
router.use("/certificates", CertificatesRoutes);

// # User
router.use("/progress", UserProgressRoutes);
router.use("/pedagogical-analytics", PedagogicalAnalyticsRouter);
router.use("/timeline", timelineRouter);
router.use("/enrollments", EnrollmentsRoutes);

export default router;

// import { Router } from "express";

// import crosswordRoutes from "./routes/Crosswords.routes";
// import chatBotRhythms from "./routes/ChatBotRhythms.routes";
// import Analytics from "./routes/Analytics.routes";
// import Support from "./routes/Support.routes";
// import Levels from "./routes/Levels.routes";

// // import { createFullTrail } from "./teste";
// import { GamesRouter } from "./routes/Games.routes";
// import BadgesRoutes from "./routes/Badges.routes";
// import RewardsRoutes from "./routes/Rewards.routes";

// import { getAdminDashboard } from "./controllers/admin.controller";
// import { AdminTrailsRoutes } from "./routes/trails/admin.trails.routes";
// import { PublicTrailsRoutes } from "./routes/trails/public.trails.routes";
// import { AdminUserRoutes } from "./routes/users/admin.user.routes";
// import { UserRoutes } from "./routes/users/user.routes";
// import { UserProgressRoutes } from "./routes/users/user.progress.routes";
// import { AdminUserProgressRoutes } from "./routes/users/admin.user.progress.routes";
// import { ModulesRoutes } from "./routes/modules/modules.routes";
// import { AdminModulesRoutes } from "./routes/modules/admin.modules.routes";
// import { LessonsRoutes } from "./routes/lessons/lessons.routes";
// import { AdminLessonsRoutes } from "./routes/lessons/admin.lessons.routes";
// import { heatmapRouter } from "./modules/Heatmap/heatmap.routes";
// import { timelineRouter } from "./modules/Timeline/timeline.routes";
// import { EnrollmentsRoutes } from "./routes/trails/enrollment.routes";
// import { CertificatesRoutes } from "./routes/trails/certificate.routes";
// import { PollRoutes } from "./routes/learning/polls.routes";
// import { AssessmentsRoutes } from "./routes/learning/assessments.routes";
// import { AdminAssessmentsRoutes } from "./routes/learning/admin.assessments.routes";

// const router = Router();

// router.use("/", UserRoutes);

// const adminRoutes = [
//   AdminUserRoutes,
//   AdminUserProgressRoutes,
//   AdminTrailsRoutes,
//   AdminModulesRoutes,
//   AdminLessonsRoutes,
//   AdminAssessmentsRoutes,
// ];

// router.use(BadgesRoutes);

// router.use(crosswordRoutes);
// router.use(chatBotRhythms);

// router.use(Analytics);
// router.use(Support);

// router.use(Levels);

// router.use(RewardsRoutes);

// // router.get("/create-trail/", createFullTrail);

// /* A partir daqui está ok! */
// // # Admin
// router.use("/admin", ...adminRoutes);
// router.use("/admin/dashboard", getAdminDashboard);

// // # Trails
// router.use("/trails", PublicTrailsRoutes);

// // # Games
// router.use(GamesRouter);

// // # Modules
// router.use("/modules", ModulesRoutes);

// // # Lessons
// router.use("/lessons", LessonsRoutes);

// // # Polls / Assessments
// router.use("/polls", PollRoutes);
// router.use("/assessments", AssessmentsRoutes);

// // # Certificate
// router.use("/certificates", CertificatesRoutes);

// // # User
// router.use("/progress", UserProgressRoutes);
// router.use("/heatmap", heatmapRouter);
// router.use("/timeline", timelineRouter);
// router.use("/enrollments", EnrollmentsRoutes);

// export default router;
