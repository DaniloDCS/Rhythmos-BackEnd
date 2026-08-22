import nodemailer, { type Transporter } from "nodemailer";
import { createPasswordResetEmail } from "./password-reset.template";
import type { SendPasswordResetEmailInput } from "./password-reset.types";

let transporter: Transporter | null = null;

const requiredEnvironmentValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configuração de e-mail ausente: ${name}`);
  return value;
};

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  const port = Number(requiredEnvironmentValue("SMTP_PORT"));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("Configuração de e-mail inválida: SMTP_PORT");
  }

  transporter = nodemailer.createTransport({
    host: requiredEnvironmentValue("SMTP_HOST"),
    port,
    secure: process.env.SMTP_SECURE?.trim().toLowerCase() === "true",
    auth: {
      user: requiredEnvironmentValue("SMTP_USER"),
      pass: requiredEnvironmentValue("SMTP_PASSWORD"),
    },
  });

  return transporter;
};

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<void> => {
  const fromAddress = requiredEnvironmentValue("EMAIL_FROM");
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "RHYTHMOS";
  const logoUrl =
    process.env.EMAIL_LOGO_URL?.trim() ||
    "https://rhythmos-frontend.onrender.com/assets/rhythmos-transparent-TH1wOoJS.png";
  const content = createPasswordResetEmail(to, resetUrl, logoUrl);

  await getTransporter().sendMail({
    from: { name: fromName, address: fromAddress },
    to,
    subject: "Redefina sua senha | RHYTHMOS",
    html: content.html,
    text: content.text,
  });
};

