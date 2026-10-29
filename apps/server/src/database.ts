import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export function openDatabase(path = "./data/gen-mod.sqlite") {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  if (!db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()) {
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  }
  return db;
}
