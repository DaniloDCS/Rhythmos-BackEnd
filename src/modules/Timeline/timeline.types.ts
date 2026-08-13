export type TimelineType =
  | "xp_gain"
  | "trail_created"
  | "trail_updated"
  | "trail_deleted"
  | "lesson_completed"
  | "module_completed"
  | "level_up"
  | "achievement_unlock"
  | "badge_earned"
  | "quiz_completed"
  | "login_streak"
  | "admin_action";

export type TimelineLevel = "info" | "success" | "warning" | "danger";

export type TimelineTargetType =
  | "trail"
  | "module"
  | "lesson"
  | "quiz"
  | "user"
  | "achievement";
