import type { Database } from "bun:sqlite";
import type { CreateGame, GameRecord, UpdateGame } from "./model";
import { ApiError } from "../../errors";
import { validName } from "../../validation";

export async function list(db: Database): Promise<GameRecord[]> {
  const result = db
    .query("SELECT id,name,description FROM games ORDER BY created_at,id")
    .all() as GameRecord[];
  return result;
}

export async function create(db: Database, input: CreateGame): Promise<GameRecord> {
  if (!validName(input.id)) {
    throw new ApiError(400, "游戏标识无效");
  }
  const existing = db.query("SELECT id FROM games WHERE id=?").get(input.id);
  if (existing) {
    throw new ApiError(409, "游戏标识已存在");
  }
  db.query("INSERT INTO games VALUES (?,?,?,?)").run(
    input.id,
    input.name,
    input.description,
    new Date().toISOString(),
  );
  return input;
}

export async function update(db: Database, id: string, input: UpdateGame): Promise<GameRecord> {
  const existing = db.query("SELECT id FROM games WHERE id=?").get(id);
  if (!existing) {
    throw new ApiError(404, "游戏不存在");
  }
  db.query("UPDATE games SET name=?,description=? WHERE id=?").run(
    input.name,
    input.description,
    id,
  );
  return { id, ...input };
}

export async function remove(db: Database, id: string): Promise<void> {
  const bound = db.query("SELECT id FROM skills WHERE game_id=? LIMIT 1").get(id);
  if (bound) {
    throw new ApiError(409, "仍有 Skill 绑定，不能删除游戏");
  }
  db.query("DELETE FROM games WHERE id=?").run(id);
}
