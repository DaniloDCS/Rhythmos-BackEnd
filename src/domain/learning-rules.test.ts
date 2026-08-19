import assert from "node:assert/strict"; import test from "node:test";
import { calculateEnrollmentProgress, calculateXpAward, canConcludeEnrollment, isCertificateValid, isRewardEligible } from "./learning-rules";
test("matrícula calcula progresso e limita em 100%", () => { assert.equal(calculateEnrollmentProgress(3, 4), 75); assert.equal(calculateEnrollmentProgress(8, 4), 100); assert.equal(calculateEnrollmentProgress(0, 0), 0); });
test("conclusão exige aulas e avaliações obrigatórias", () => { assert.equal(canConcludeEnrollment(4, 4, true), true); assert.equal(canConcludeEnrollment(4, 4, false), false); assert.equal(canConcludeEnrollment(3, 4, true), false); });
test("XP não duplica e respeita limite diário", () => { assert.equal(calculateXpAward(20, true), 0); assert.equal(calculateXpAward(20, false, 50, 40), 10); assert.equal(calculateXpAward(20, false), 20); });
test("recompensa depende de meta e estado ativo", () => { assert.equal(isRewardEligible(10, 10), true); assert.equal(isRewardEligible(9, 10), false); assert.equal(isRewardEligible(20, 10, false), false); });
test("certificado revogado nunca é válido", () => { assert.equal(isCertificateValid("valido"), true); assert.equal(isCertificateValid("valido", new Date()), false); assert.equal(isCertificateValid("revogado"), false); });
