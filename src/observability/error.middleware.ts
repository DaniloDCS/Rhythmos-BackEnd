import type { NextFunction, Request, Response } from "express";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { log } from "./logger";
export const errorObservability = (error: Error & { status?: number }, req: Request, res: Response, _next: NextFunction) => { const status = Number(error.status) || 500; const requestId = res.getHeader("x-request-id")?.toString(); log("error", "unhandled_error", { requestId, status, method: req.method, path: req.originalUrl, message: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined }); if (status >= 500) void db.collection("system_alerts").add({ severity: "critical", source: "backend", message: error.message, requestId, path: req.originalUrl.split("?")[0], resolved: false, createdAt: Timestamp.now() }).catch(() => undefined); if (!res.headersSent) res.status(status).json({ message: status >= 500 ? "Erro interno do servidor." : error.message, requestId }); };
