import { Router } from "express";
import { withAdmin } from "../../middlewares/withAdmin";
import {
  ProgressGetByUserId,
  ProgressAddXp,
  ProgressCreate,
  ProgressDelete,
  ProgressGetAll,
  ProgressUpdate,
} from "../../controllers/UserProgress.controller";

export const AdminUserProgressRoutes = Router();

AdminUserProgressRoutes.post("/progress", ...withAdmin(ProgressCreate));
AdminUserProgressRoutes.get("/progress", ...withAdmin(ProgressGetAll));
AdminUserProgressRoutes.get("/progress/:id", ...withAdmin(ProgressGetByUserId));
AdminUserProgressRoutes.put("/progress/:id", ...withAdmin(ProgressUpdate));
AdminUserProgressRoutes.patch("/progress/:id", ...withAdmin(ProgressAddXp));
AdminUserProgressRoutes.delete("/progress/:id", ...withAdmin(ProgressDelete));
