import type { Request, Response } from "express";
import { z } from "zod";
import { requestPasswordReset } from "./password-reset.service";

const PASSWORD_RESET_RESPONSE =
  "Se existir uma conta associada a este e-mail, você receberá as instruções para redefinir sua senha.";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export const forgotPassword = async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Informe um endereço de e-mail válido.",
    });
  }

  // A resposta não aguarda Firebase/SMTP para reduzir diferenças de tempo entre
  // contas existentes e inexistentes. O serviço registra falhas internamente.
  void requestPasswordReset(parsed.data.email);
  return res.status(202).json({ message: PASSWORD_RESET_RESPONSE });
};
