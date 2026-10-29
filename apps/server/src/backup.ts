import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { openDatabase } from "./database";

const target = resolve(
  process.argv[2] ?? `./backups/${new Date().toISOString().replace(/:/g, "-")}.sqlite`,
);
mkdirSync(dirname(target), { recursive: true });
const db = openDatabase(process.env.DATABASE_PATH);
db.query("VACUUM INTO ?").run(target);
db.close();
console.log(`SQLite 快照：${target}`);
