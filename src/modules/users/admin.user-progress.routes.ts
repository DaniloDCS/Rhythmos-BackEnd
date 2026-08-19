import { Router } from "express";
import { withAdmin } from "../../middlewares/with-admin";
import {
  ProgressGetByUserId,
  ProgressAddXp,
  ProgressCreate,
  ProgressDelete,
  ProgressGetAll,
  ProgressUpdate,
  AcademicIndicesGetByUserId,
} from "./admin.user-progress.controller";

export const AdminUserProgressRoutes = Router();

AdminUserProgressRoutes.post("/progress", ...withAdmin(ProgressCreate));
AdminUserProgressRoutes.get("/progress", ...withAdmin(ProgressGetAll));
AdminUserProgressRoutes.get("/progress/:id", ...withAdmin(ProgressGetByUserId));
AdminUserProgressRoutes.get("/progress/:id/academic-indices", ...withAdmin(AcademicIndicesGetByUserId));
AdminUserProgressRoutes.put("/progress/:id", ...withAdmin(ProgressUpdate));
AdminUserProgressRoutes.patch("/progress/:id", ...withAdmin(ProgressAddXp));
AdminUserProgressRoutes.delete("/progress/:id", ...withAdmin(ProgressDelete));
