import { Router } from "express";
import {
  createAssessment,
  deleteAssessment,
  getAssessmentAdmin,
  listAssessmentsAdmin,
  updateAssessment,
} from "../../controllers/Assessment.controller";
import { withAdmin } from "../../middlewares/withAdmin";

export const AdminAssessmentsRoutes = Router();

AdminAssessmentsRoutes.route("/assessments")
  .get(...withAdmin(listAssessmentsAdmin))
  .post(...withAdmin(createAssessment));

AdminAssessmentsRoutes.route("/assessments/:id")
  .get(...withAdmin(getAssessmentAdmin))
  .patch(...withAdmin(updateAssessment))
  .put(...withAdmin(updateAssessment))
  .delete(...withAdmin(deleteAssessment));
