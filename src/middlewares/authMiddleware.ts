import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";

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

    next();
  } catch (error) {
    console.error({ error });
    return res.status(401).json({
      message: "Token inválido ou expirado.",
    });
  }
};
