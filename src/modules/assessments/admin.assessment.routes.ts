import { Router } from "express";
import {
  createAssessment,
  deleteAssessment,
  getAssessmentAdmin,
  listAssessmentsAdmin,
  updateAssessment,
} from "./admin.assessment.controller";
import { withAdmin } from "../../middlewares/with-admin";

export const AdminAssessmentsRoutes = Router();

AdminAssessmentsRoutes.route("/assessments")
  .get(...withAdmin(listAssessmentsAdmin))
  .post(...withAdmin(createAssessment));

AdminAssessmentsRoutes.route("/assessments/:id")
  .get(...withAdmin(getAssessmentAdmin))
  .patch(...withAdmin(updateAssessment))
  .put(...withAdmin(updateAssessment))
  .delete(...withAdmin(deleteAssessment));
