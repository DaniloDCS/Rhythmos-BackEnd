export interface PasswordResetEmailContent {
  html: string;
  text: string;
}

export interface SendPasswordResetEmailInput {
  to: string;
  resetUrl: string;
}

