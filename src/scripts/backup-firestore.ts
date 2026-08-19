import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "../config/firebase";
const serialize = (value: any): any => value?.toDate?.() instanceof Date ? value.toDate().toISOString() : Array.isArray(value) ? value.map(serialize) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)])) : value;
const run = async () => { const outputRoot = path.resolve(process.env.BACKUP_OUTPUT_DIR ?? "backups"); const stamp = new Date().toISOString().replace(/[:.]/g, "-"); const target = path.join(outputRoot, stamp); await mkdir(target, { recursive: true }); const collections = await db.listCollections(); const manifest: Record<string, number> = {}; for (const collection of collections) { const snapshot = await collection.get(); const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) })); await writeFile(path.join(target, `${collection.id}.json`), JSON.stringify(rows, null, 2), "utf8"); manifest[collection.id] = rows.length; } await writeFile(path.join(target, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), collections: manifest }, null, 2)); console.log(JSON.stringify({ event: "backup_complete", target, collections: manifest })); };
run().catch((error) => { console.error(error); process.exitCode = 1; });
