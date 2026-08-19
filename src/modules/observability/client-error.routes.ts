import { Router } from "express"; import { verifyFirebaseToken } from "../../middlewares/auth.middleware"; import { reportClientError } from "./client-error.controller";
export const ClientErrorRoutes = Router(); ClientErrorRoutes.post("/", verifyFirebaseToken, reportClientError);
