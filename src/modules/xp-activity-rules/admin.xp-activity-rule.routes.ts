import { Router } from "express";
import { withAdmin } from "../../middlewares/with-admin";
import { createXpActivityRule, deleteXpActivityRule, listXpActivityRules, updateXpActivityRule } from "./admin.xp-activity-rule.controller";

export const AdminXpActivityRuleRoutes = Router();
AdminXpActivityRuleRoutes.get("/", ...withAdmin(listXpActivityRules));
AdminXpActivityRuleRoutes.post("/", ...withAdmin(createXpActivityRule));
AdminXpActivityRuleRoutes.patch("/:id", ...withAdmin(updateXpActivityRule));
AdminXpActivityRuleRoutes.put("/:id", ...withAdmin(updateXpActivityRule));
AdminXpActivityRuleRoutes.delete("/:id", ...withAdmin(deleteXpActivityRule));
