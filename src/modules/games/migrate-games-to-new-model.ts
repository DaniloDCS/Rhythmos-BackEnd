import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";

const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeStatus = (value: unknown): string => {
  if (typeof value !== "string") return "em_construcao";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
};

const normalizeCategory = (value: unknown): string => {
  if (typeof value !== "string") return "outro";

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return [
    "quiz",
    "associacao",
    "velocidade",
    "memoria",
    "arraste_e_solte",
    "outro",
  ].includes(normalized)
    ? normalized
    : "outro";
};

const normalizeDifficulty = (value: unknown): string => {
  if (typeof value !== "string") return "facil";

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return ["facil", "medio", "dificil"].includes(normalized)
    ? normalized
    : "facil";
};

export const migrateGamesToNewModel = async () => {
  const snapshot = await db.collection("games").get();

  if (snapshot.empty) {
    console.log("Nenhum jogo encontrado.");
    return;
  }

  const batch = db.batch();
  const usedSlugs = new Set<string>();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    let status = normalizeStatus(data.status);

    if (data.active === false && status === "disponivel") {
      status = "indisponivel";
    }

    const baseSlug = slugify(data.slug || data.name || doc.id) || doc.id;

    let slug = baseSlug;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);

    batch.set(
      doc.ref,
      {
        id: doc.id,
        name: String(data.name ?? "Novo jogo").trim(),
        slug,
        description: data.description ?? null,
        shortDescription: data.shortDescription ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        category: normalizeCategory(data.category),
        difficulty: normalizeDifficulty(data.difficulty),
        status,
        featured: Boolean(data.featured ?? false),
        players: Math.max(0, Number(data.players ?? 0)),
        xpReward: Math.max(0, Number(data.xpReward ?? data.xpBaseReward ?? 0)),
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: data.createdAt ?? Timestamp.now(),
        updatedAt: Timestamp.now(),

        route: FieldValue.delete(),
        icon: FieldValue.delete(),
        active: FieldValue.delete(),
        order: FieldValue.delete(),
        minLevelRequired: FieldValue.delete(),
        xpBaseReward: FieldValue.delete(),
        rewardRules: FieldValue.delete(),
        createdBy: FieldValue.delete(),
        updatedBy: FieldValue.delete(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  console.log(`${snapshot.size} jogo(s) migrado(s) para o novo modelo.`);
};

migrateGamesToNewModel()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro ao migrar jogos:", error);
    process.exit(1);
  });
