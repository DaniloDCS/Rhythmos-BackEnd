import { Router } from "express";
import { AdminAnalyticsRoutes } from "./modules/analytics/admin.analytics.routes";
import { AdminAssessmentsRoutes } from "./modules/assessments/admin.assessment.routes";
import { AdminBadgeRoutes } from "./modules/badges/admin.badge.routes";
import { AdminClinicalRoutes } from "./modules/clinical/admin.clinical.routes";
import { AdminCertificatesRoutes } from "./modules/certificates/admin.certificate.routes";
import { AdminCrosswordRoutes } from "./modules/crosswords/admin.crossword.routes";
import { AdminDashboardRoutes } from "./modules/dashboard/admin.dashboard.routes";
import { AdminGameRoutes } from "./modules/games/admin.game.routes";
import { AdminKnowledgeRoutes } from "./modules/knowledge/admin.knowledge.routes";
import { AdminModulesRoutes } from "./modules/learning-modules/admin.module.routes";
import { AdminLessonsRoutes } from "./modules/lessons/admin.lesson.routes";
import { AdminLevelRoutes } from "./modules/levels/admin.level.routes";
import { AdminLaboratoryRoutes } from "./modules/laboratory/admin.laboratory.routes";
import { AdminRewardRoutes } from "./modules/rewards/admin.reward.routes";
import { AdminRhythmRoutes } from "./modules/rhythms/admin.rhythm.routes";
import { AdminSupportRoutes } from "./modules/support/admin.support.routes";
import { AdminTimelineRoutes } from "./modules/timeline/admin.timeline.routes";
import { AdminTrailRoutes } from "./modules/trails/admin.trail.routes";
import { AdminUserProgressRoutes } from "./modules/users/admin.user-progress.routes";
import { AdminUserRoutes } from "./modules/users/admin.user.routes";
import { AdminXpActivityRuleRoutes } from "./modules/xp-activity-rules/admin.xp-activity-rule.routes";
import { AdminAnnouncementRoutes } from "./modules/announcements/admin.announcement.routes";
import { AdminFeedbackRoutes } from "./modules/feedback/admin.feedback.routes";
import { AdminAuditRoutes } from "./modules/audit/admin-audit.routes";
import { verifyFirebaseToken } from "./middlewares/auth.middleware";
import { requireAdmin } from "./middlewares/admin.middleware";
import { auditAdminMutation } from "./modules/audit/admin-audit.middleware";
import { AdminObservabilityRoutes } from "./modules/observability/admin-observability.routes";
import { AdminPrivacyPolicyRoutes } from "./modules/privacy/admin-privacy-policy.routes";

export const adminRoutes = Router();

adminRoutes.use("/admin", verifyFirebaseToken, requireAdmin, auditAdminMutation);
adminRoutes.use("/admin/audit", AdminAuditRoutes);
adminRoutes.use("/admin/observability", AdminObservabilityRoutes);
adminRoutes.use("/admin/privacy-policies", AdminPrivacyPolicyRoutes);

adminRoutes.use("/admin/badges", AdminBadgeRoutes);
adminRoutes.use("/admin/announcements", AdminAnnouncementRoutes);
adminRoutes.use("/admin/feedback", AdminFeedbackRoutes);
adminRoutes.use("/admin/crosswords", AdminCrosswordRoutes);
adminRoutes.use("/admin", AdminRhythmRoutes);
adminRoutes.use("/admin", AdminAnalyticsRoutes);
adminRoutes.use("/admin", AdminSupportRoutes);
adminRoutes.use("/admin/levels", AdminLevelRoutes);
adminRoutes.use("/admin/laboratory-modules", AdminLaboratoryRoutes);
adminRoutes.use("/admin/rewards", AdminRewardRoutes);
adminRoutes.use("/admin/xp-activity-rules", AdminXpActivityRuleRoutes);
adminRoutes.use("/admin/dashboard", AdminDashboardRoutes);
adminRoutes.use("/admin/games", AdminGameRoutes);
adminRoutes.use("/admin/clinical-cases", AdminClinicalRoutes);
adminRoutes.use("/admin/certificates", AdminCertificatesRoutes);
adminRoutes.use("/admin/knowledge", AdminKnowledgeRoutes);
adminRoutes.use("/timeline", AdminTimelineRoutes);
adminRoutes.use(
  "/admin",
  AdminUserRoutes,
  AdminUserProgressRoutes,
  AdminTrailRoutes,
  AdminModulesRoutes,
  AdminLessonsRoutes,
  AdminAssessmentsRoutes,
);
