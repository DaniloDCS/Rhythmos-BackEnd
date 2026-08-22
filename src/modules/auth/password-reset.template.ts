import type { PasswordResetEmailContent } from "./password-reset.types";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });

export const createPasswordResetEmail = (
  email: string,
  resetUrl: string,
  logoUrl: string,
): PasswordResetEmailContent => {
  const safeEmail = escapeHtml(email);
  const safeResetUrl = escapeHtml(resetUrl);
  const safeLogoUrl = escapeHtml(logoUrl);

  return {
    text: [
      "Segurança da conta",
      "",
      "Redefina sua senha",
      "",
      "Olá!",
      "",
      "Recebemos uma solicitação para redefinir a senha da conta associada ao e-mail:",
      email,
      "",
      "Redefinir minha senha:",
      resetUrl,
      "",
      "Se você não solicitou a redefinição, ignore esta mensagem. Nenhuma alteração será realizada.",
      "",
      "RHYTHMOS",
      "Plataforma educacional para aprendizagem em eletrocardiograma.",
      "",
      "Esta é uma mensagem automática. Não responda a este e-mail.",
    ].join("\n"),
    html: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Redefina sua senha | RHYTHMOS</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { padding: 18px 10px !important; }
        .email-card-cell { padding: 30px 22px !important; }
        .email-title { font-size: 27px !important; }
        .email-button { display: block !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f7f8;color:#183c35;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f7f8;">
      <tr>
        <td class="email-shell" align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
            <tr>
              <td align="center" style="padding:0 0 22px;">
                <img src="${safeLogoUrl}" width="190" alt="RHYTHMOS" style="display:block;width:190px;max-width:70%;height:auto;border:0;">
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #e2ebe8;border-radius:22px;background:#ffffff;box-shadow:0 18px 45px rgba(24,60,53,.10);overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="height:7px;background:#3e8577;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="email-card-cell" style="padding:42px 44px 38px;">
                      <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#eaf4f1;color:#2f7064;font-size:12px;font-weight:700;letter-spacing:.04em;">Segurança da conta</span>
                      <h1 class="email-title" style="margin:20px 0 14px;color:#183c35;font-size:32px;line-height:1.2;letter-spacing:-.02em;">Redefina sua senha</h1>
                      <p style="margin:0 0 18px;color:#62716e;font-size:16px;line-height:1.7;">Olá! Recebemos uma solicitação para redefinir a senha da conta associada ao e-mail:</p>
                      <p style="margin:0 0 28px;padding:13px 16px;border:1px solid #e7eeec;border-radius:12px;background:#f7faf9;color:#183c35;font-size:15px;font-weight:700;word-break:break-word;">${safeEmail}</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="padding:0 0 28px;">
                            <a class="email-button" href="${safeResetUrl}" style="display:inline-block;padding:15px 25px;border-radius:12px;background:#3e8577;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 10px 22px rgba(62,133,119,.24);">Redefinir minha senha</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 24px;color:#62716e;font-size:14px;line-height:1.65;">Se você não solicitou a redefinição da senha, pode ignorar este e-mail com segurança. Nenhuma alteração será realizada em sua conta.</p>
                      <p style="margin:0 0 8px;color:#75817f;font-size:12px;line-height:1.55;">Se o botão acima não funcionar, copie e cole o endereço abaixo em seu navegador:</p>
                      <p style="margin:0;padding:12px;border:1px solid #e7eeec;border-radius:10px;background:#f7faf9;color:#3e8577;font-size:12px;line-height:1.55;word-break:break-all;"><a href="${safeResetUrl}" style="color:#3e8577;text-decoration:underline;">${safeResetUrl}</a></p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:28px 30px;border-top:1px solid #e7eeec;background:#fbfcfc;">
                      <strong style="display:block;margin-bottom:7px;color:#183c35;font-size:15px;letter-spacing:.08em;">RHYTHMOS</strong>
                      <span style="display:block;color:#62716e;font-size:12px;line-height:1.6;">Plataforma educacional para aprendizagem em eletrocardiograma.</span>
                      <span style="display:block;margin-top:12px;color:#8a9593;font-size:11px;line-height:1.5;">Esta é uma mensagem automática. Não responda a este e-mail.</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};

