import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";
import { recordUserSession } from "../modules/privacy/session.service";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Token não informado.",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const decodedToken = await auth.verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role as string | undefined,
    };

    recordUserSession(req);

    next();
  } catch (error) {
    console.error({ error });
    return res.status(401).json({
      error: error instanceof Error ? error.message : String(error),
      message: "Token inválido ou expirado.",
    });
  }
};
