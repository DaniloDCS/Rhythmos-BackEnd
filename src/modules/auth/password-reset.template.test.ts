import assert from "node:assert/strict";
import test from "node:test";
import { createPasswordResetEmail } from "./password-reset.template";

test("password reset template includes the RHYTHMOS content and reset URL", () => {
  const content = createPasswordResetEmail(
    "usuario@example.com",
    "https://app.example.com/reset-password?oobCode=secure-code",
    "https://app.example.com/logo.png",
  );

  assert.match(content.html, /Redefina sua senha/);
  assert.match(content.html, /Segurança da conta/);
  assert.match(content.html, /usuario@example\.com/);
  assert.match(content.html, /oobCode=secure-code/);
  assert.match(content.text, /Plataforma educacional/);
});

test("password reset template escapes untrusted values", () => {
  const content = createPasswordResetEmail(
    'user"><script>alert(1)</script>@example.com',
    'https://app.example.com/reset?value="><script>alert(1)</script>',
    'https://app.example.com/logo.png" onerror="alert(1)',
  );

  assert.doesNotMatch(content.html, /<script>/);
  assert.doesNotMatch(content.html, /onerror="alert/);
  assert.match(content.html, /&lt;script&gt;/);
});

