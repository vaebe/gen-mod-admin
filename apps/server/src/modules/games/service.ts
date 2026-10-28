import type { CreateGame, GameRecord, UpdateGame } from "./model";
import { ApiError } from "../../errors";
import { validName } from "../../validation";

export async function list(db: D1Database): Promise<GameRecord[]> {
  const result = await db
    .prepare("SELECT id,name,description FROM games ORDER BY created_at,id")
    .all<GameRecord>();
  return result.results;
}

export async function create(db: D1Database, input: CreateGame): Promise<GameRecord> {
  if (!validName(input.id)) {
    throw new ApiError(400, "游戏标识无效");
  }
  const existing = await db.prepare("SELECT id FROM games WHERE id=?").bind(input.id).first();
  if (existing) {
    throw new ApiError(409, "游戏标识已存在");
  }
  await db
    .prepare("INSERT INTO games VALUES (?,?,?,?)")
    .bind(input.id, input.name, input.description, new Date().toISOString())
    .run();
  return input;
}

export async function update(db: D1Database, id: string, input: UpdateGame): Promise<GameRecord> {
  const existing = await db.prepare("SELECT id FROM games WHERE id=?").bind(id).first();
  if (!existing) {
    throw new ApiError(404, "游戏不存在");
  }
  await db
    .prepare("UPDATE games SET name=?,description=? WHERE id=?")
    .bind(input.name, input.description, id)
    .run();
  return { id, ...input };
}

export async function remove(db: D1Database, id: string): Promise<void> {
  const bound = await db.prepare("SELECT id FROM skills WHERE game_id=? LIMIT 1").bind(id).first();
  if (bound) {
    throw new ApiError(409, "仍有 Skill 绑定，不能删除游戏");
  }
  await db.prepare("DELETE FROM games WHERE id=?").bind(id).run();
}
