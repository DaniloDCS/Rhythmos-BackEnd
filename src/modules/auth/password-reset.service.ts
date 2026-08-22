import { auth } from "../../config/firebase";
import { log } from "../../observability/logger";
import { sendPasswordResetEmail } from "./email.service";

const normalizeFrontendUrl = (): string => {
  const configuredUrl =
    process.env.FRONTEND_URL?.trim() || process.env.CORS_ORIGIN?.trim();
  if (!configuredUrl) throw new Error("FRONTEND_URL não configurada.");

  const url = new URL(configuredUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("FRONTEND_URL deve usar HTTP ou HTTPS.");
  }

  return url.origin;
};

const createRhythmosResetUrl = (firebaseLink: string, frontendUrl: string): string => {
  const firebaseUrl = new URL(firebaseLink);
  const resetUrl = new URL("/reset-password", frontendUrl);

  for (const parameter of ["mode", "oobCode", "apiKey", "continueUrl", "lang"]) {
    const value = firebaseUrl.searchParams.get(parameter);
    if (value) resetUrl.searchParams.set(parameter, value);
  }

  if (!resetUrl.searchParams.get("oobCode")) {
    throw new Error("O Firebase não retornou um código de redefinição.");
  }

  resetUrl.searchParams.set("mode", "resetPassword");
  return resetUrl.toString();
};

const isUnknownUserError = (caught: unknown): boolean => {
  if (!caught || typeof caught !== "object" || !("code" in caught)) return false;
  return (caught as { code?: unknown }).code === "auth/user-not-found";
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    const frontendUrl = normalizeFrontendUrl();
    const firebaseLink = await auth.generatePasswordResetLink(email, {
      url: `${frontendUrl}/reset-password`,
      handleCodeInApp: false,
    });
    const resetUrl = createRhythmosResetUrl(firebaseLink, frontendUrl);

    await sendPasswordResetEmail({ to: email, resetUrl });
  } catch (caught) {
    if (isUnknownUserError(caught)) return;

    log("error", "auth_password_reset_email_failed", {
      errorCode:
        caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code?: unknown }).code)
          : undefined,
      message: caught instanceof Error ? caught.message : "Erro desconhecido",
    });
  }
};
