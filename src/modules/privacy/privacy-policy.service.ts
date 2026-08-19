import { db } from "../../config/firebase";

export const DEFAULT_POLICY = { id: "default", version: process.env.PRIVACY_POLICY_VERSION ?? "2026-08-18", title: "Termos de Uso e Política de Privacidade", summary: "Seu aprendizado e seus dados tratados com responsabilidade.", termsContent: "Ao criar uma conta, você concorda em utilizar o Rhythmos para fins legítimos de aprendizagem, manter suas credenciais protegidas e fornecer informações verdadeiras. Não é permitido comprometer a segurança, copiar conteúdo protegido ou interferir na experiência de outros usuários.", privacyContent: "O Rhythmos trata dados cadastrais, acadêmicos e técnicos necessários para autenticação, personalização, certificação, suporte, segurança e melhoria pedagógica. Os dados não são comercializados. Você pode acessar, corrigir e exportar seus dados, consultar sessões e solicitar a exclusão da conta.", status: "published" };

export const getCurrentPrivacyPolicy = async () => {
  const snapshot = await db.collection("privacy_policies").where("status", "==", "published").get();
  const policies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
  policies.sort((a, b) => (b.publishedAt?.toMillis?.() ?? 0) - (a.publishedAt?.toMillis?.() ?? 0));
  return policies[0] ?? DEFAULT_POLICY;
};
