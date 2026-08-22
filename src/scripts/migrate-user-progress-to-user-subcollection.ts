import "dotenv/config";
import { db } from "../config/firebase";
import { userGamificationRef } from "../modules/gamification/user-gamification.repository";
import { syncRankingProfile } from "../modules/gamification/ranking-profile.service";

type Mode = "dry-run" | "copy" | "validate" | "cleanup";
const canonical = (value: unknown): unknown => {
  if (value && typeof value === "object") {
    const timestamp = value as { toMillis?: () => number };
    if (typeof timestamp.toMillis === "function") return { __timestampMillis: timestamp.toMillis() };
    if (Array.isArray(value)) return value.map(canonical);
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
};
export const progressDocumentsEqual = (legacy: unknown, current: unknown) => JSON.stringify(canonical(legacy)) === JSON.stringify(canonical(current));
const selectedMode = (): Mode => process.argv.includes("--copy") ? "copy" : process.argv.includes("--validate") ? "validate" : process.argv.includes("--cleanup") ? "cleanup" : "dry-run";

export const runUserProgressMigration = async (mode: Mode = selectedMode()) => {
  const report = { totalLegacy: 0, usersFound: 0, created: 0, existing: 0, identical: 0, divergences: [] as string[], missingUsers: [] as string[], errors: [] as string[], rankingCreatedOrUpdated: 0 };
  const legacy = await db.collection("user_progress").get();
  report.totalLegacy = legacy.size;
  for (const document of legacy.docs) {
    const uid = document.id;
    try {
      const [user, target] = await Promise.all([db.collection("users").doc(uid).get(), userGamificationRef(uid).get()]);
      if (!user.exists) { report.missingUsers.push(uid); continue; }
      report.usersFound += 1;
      const source = { ...document.data(), userId: String(document.data().userId ?? uid) };
      if (!target.exists) {
        report.created += 1;
        if (mode === "copy") { await userGamificationRef(uid).set(source); await syncRankingProfile(uid); report.rankingCreatedOrUpdated += 1; }
      } else {
        report.existing += 1;
        if (progressDocumentsEqual(source, target.data())) {
          report.identical += 1;
          if (mode === "copy") { await syncRankingProfile(uid); report.rankingCreatedOrUpdated += 1; }
        } else report.divergences.push(uid);
      }
    } catch (error) { report.errors.push(`${uid}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (mode === "cleanup") {
    if (!process.argv.includes("--confirm-cleanup")) throw new Error("Cleanup exige --confirm-cleanup.");
    if (report.missingUsers.length || report.divergences.length || report.errors.length || report.identical !== report.totalLegacy) throw new Error("Cleanup bloqueado: validação integral não passou.");
    for (let index = 0; index < legacy.docs.length; index += 400) { const batch = db.batch(); legacy.docs.slice(index, index + 400).forEach((doc) => batch.delete(doc.ref)); await batch.commit(); }
  }
  console.log(JSON.stringify({ mode, report }, null, 2));
  return report;
};
if (require.main === module) runUserProgressMigration().catch((error) => { console.error(error); process.exitCode = 1; });
