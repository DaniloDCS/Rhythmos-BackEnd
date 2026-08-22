import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { forgotPassword } from "./password-reset.controller";

export const PasswordResetRoutes = Router();

const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Muitas solicitações foram feitas. Aguarde alguns minutos antes de tentar novamente.",
  },
  skipSuccessfulRequests: false,
  validate: { xForwardedForHeader: false },
});

PasswordResetRoutes.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  forgotPassword,
);
