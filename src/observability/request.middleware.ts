import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { log } from "./logger";
export const requestObservability = (req: Request, res: Response, next: NextFunction) => { const requestId = req.get("x-request-id") || randomUUID(); const started = Date.now(); res.setHeader("x-request-id", requestId); res.on("finish", () => log(res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info", "http_request", { requestId, method: req.method, path: req.originalUrl.split("?")[0], statusCode: res.statusCode, durationMs: Date.now() - started, ip: req.ip })); next(); };
