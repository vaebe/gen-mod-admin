import type { Database } from "bun:sqlite";
import type { Env } from "../../env";
import type {
  CatalogSkill,
  CreateSkill,
  ManifestSnapshot,
  PublishSkill,
  SkillRecord,
  SkillVersionRecord,
  UpdateSkill,
} from "./model";
import { ApiError } from "../../errors";
import { validName } from "../../validation";
import { SkillCodec } from "./model";

type SkillRow = {
  id: string;
  name: string;
  description: string;
  dependencies: string;
  exclude_paths: string;
  required_command_scripts: string;
  inspection_file: string | null;
} & ({ kind: "common"; game_id: null } | { kind: "game"; game_id: string });

interface VersionRow {
  id: string;
  skill_id: string;
  version: string;
  content_hash: string;
  file_id: string;
  uploaded_at: string;
  manifest: string;
}

const MAX_VERSIONS = 5;

function packageKey(skill: Pick<SkillRecord, "id" | "gameId">, fileId: string): string {
  return `skills/${skill.gameId ?? "common"}/${skill.id}/${fileId}.zip`;
}

function skillRecord(row: SkillRow): SkillRecord {
  const fields = {
    id: row.id,
    name: row.name,
    description: row.description,
    dependencies: SkillCodec.strings.parse(JSON.parse(row.dependencies)),
    excludePaths: SkillCodec.strings.parse(JSON.parse(row.exclude_paths)),
    requiredCommandScripts: SkillCodec.strings.parse(JSON.parse(row.required_command_scripts)),
    inspectionFile: row.inspection_file,
  };
  return row.kind === "common"
    ? { ...fields, kind: "common", gameId: null }
    : { ...fields, kind: "game", gameId: row.game_id };
}

function versionRecord(row: VersionRow): SkillVersionRecord {
  return {
    id: row.id,
    skillId: row.skill_id,
    version: row.version,
    contentHash: row.content_hash,
    fileId: row.file_id,
    uploadedAt: row.uploaded_at,
    manifest: SkillCodec.snapshot.parse(JSON.parse(row.manifest)),
  };
}

async function versions(db: Database, skillId: string): Promise<SkillVersionRecord[]> {
  const result = db
    .query("SELECT * FROM skill_versions WHERE skill_id=? ORDER BY uploaded_at DESC,id DESC")
    .all(skillId) as VersionRow[];
  return result.map(versionRecord);
}

export async function read(db: Database, id: string): Promise<SkillRecord> {
  const row = db.query("SELECT * FROM skills WHERE id=?").get(id) as SkillRow | null;
  if (!row) {
    throw new ApiError(404, "Skill 不存在");
  }
  return skillRecord(row);
}

export async function list(db: Database): Promise<CatalogSkill[]> {
  const result = db.query("SELECT * FROM skills ORDER BY created_at,id").all() as SkillRow[];
  return Promise.all(
    result.map(async (row) => ({
      ...skillRecord(row),
      versions: await versions(db, row.id),
    })),
  );
}

export async function create(db: Database, input: CreateSkill): Promise<SkillRecord> {
  if (!validName(input.name)) {
    throw new ApiError(400, "Skill 名称无效");
  }
  const validBinding =
    input.kind === "common"
      ? input.gameId === null
      : input.gameId && db.query("SELECT id FROM games WHERE id=?").get(input.gameId);
  if (!validBinding) {
    throw new ApiError(400, "游戏 Skill 必须绑定已有游戏；通用 Skill 不绑定游戏");
  }
  if (db.query("SELECT id FROM skills WHERE name=?").get(input.name)) {
    throw new ApiError(409, "Skill 名称已存在");
  }
  const id = crypto.randomUUID();
  db.query(`
    INSERT INTO skills(id,name,description,kind,game_id,dependencies,exclude_paths,required_command_scripts,inspection_file,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    input.name,
    input.description,
    input.kind,
    input.gameId,
    JSON.stringify(input.dependencies ?? []),
    JSON.stringify(input.excludePaths ?? []),
    JSON.stringify(input.requiredCommandScripts ?? []),
    input.inspectionFile ?? null,
    new Date().toISOString(),
  );
  return read(db, id);
}

export async function update(db: Database, id: string, input: UpdateSkill): Promise<SkillRecord> {
  const old = await read(db, id);
  db.query(`
    UPDATE skills SET description=?,dependencies=?,exclude_paths=?,required_command_scripts=?,inspection_file=?
    WHERE id=?
  `).run(
    input.description,
    JSON.stringify(input.dependencies ?? old.dependencies),
    JSON.stringify(input.excludePaths ?? old.excludePaths),
    JSON.stringify(input.requiredCommandScripts ?? old.requiredCommandScripts),
    input.inspectionFile === undefined ? old.inspectionFile : input.inspectionFile,
    id,
  );
  return read(db, id);
}

function manifestFor(skill: SkillRecord, input: PublishSkill): ManifestSnapshot {
  const fields = {
    version: input.version,
    dependencies: input.dependencies ?? skill.dependencies,
    excludePaths: input.excludePaths ?? skill.excludePaths,
    requiredCommandScripts: input.requiredCommandScripts ?? skill.requiredCommandScripts,
    inspectionFile:
      input.inspectionFile === undefined ? skill.inspectionFile : input.inspectionFile,
  };
  return skill.kind === "common"
    ? { ...fields, category: "common", gameId: null }
    : { ...fields, category: "game", gameId: skill.gameId };
}

export async function requestUpload(env: Env, id: string, userId: string) {
  const skill = await read(env.DB, id);
  const fileId = crypto.randomUUID();
  const upload = env.SKILL_PACKS.upload(fileId, packageKey(skill, fileId));
  env.DB.query("INSERT INTO skill_uploads(id,skill_id,user_id) VALUES (?,?,?)").run(
    upload.fileId,
    id,
    userId,
  );
  return upload;
}

export async function cleanupUpload(env: Env, id: string, fileId: string, userId: string) {
  const upload = env.DB.query(
    "SELECT id FROM skill_uploads WHERE id=? AND skill_id=? AND user_id=?",
  ).get(fileId, id, userId);
  if (upload && !env.DB.query("SELECT id FROM skill_versions WHERE file_id=?").get(fileId)) {
    const skill = await read(env.DB, id);
    await env.SKILL_PACKS.delete(packageKey(skill, fileId));
    env.DB.query("DELETE FROM skill_uploads WHERE id=?").run(fileId);
  }
  return { ok: true };
}

export async function publish(
  env: Env,
  id: string,
  input: PublishSkill,
  userId: string,
): Promise<SkillVersionRecord> {
  const skill = await read(env.DB, id);
  const upload = env.DB.query(
    "SELECT id FROM skill_uploads WHERE id=? AND skill_id=? AND user_id=?",
  ).get(input.fileId, id, userId);
  if (!upload) {
    throw new ApiError(400, "上传记录不存在，请重新上传");
  }
  await env.SKILL_PACKS.stat(packageKey(skill, input.fileId));
  const description = input.description ?? skill.description;
  const record: SkillVersionRecord = {
    id: crypto.randomUUID(),
    skillId: id,
    version: input.version,
    contentHash: input.contentHash,
    fileId: input.fileId,
    uploadedAt: new Date().toISOString(),
    manifest: manifestFor(skill, input),
  };
  // 版本记录和当前清单一并写入，沿用版本号唯一与最多五个版本的规则。
  env.DB.transaction(() => {
    const current = env.DB.query("SELECT version FROM skill_versions WHERE skill_id=?").all(id) as {
      version: string;
    }[];
    if (current.some((item) => item.version === input.version)) {
      throw new ApiError(409, "版本号已存在；内容变更请提高版本号");
    }
    if (current.length >= MAX_VERSIONS) {
      throw new ApiError(409, "最多 5 个版本，请先移除旧版本");
    }
    env.DB.query(
      "INSERT INTO skill_versions(id,skill_id,version,content_hash,file_id,uploaded_at,manifest) VALUES (?,?,?,?,?,?,?)",
    ).run(
      record.id,
      id,
      record.version,
      record.contentHash,
      record.fileId,
      record.uploadedAt,
      JSON.stringify(record.manifest),
    );
    const manifest = record.manifest;
    env.DB.query(
      "UPDATE skills SET description=?,dependencies=?,exclude_paths=?,required_command_scripts=?,inspection_file=? WHERE id=?",
    ).run(
      description,
      JSON.stringify(manifest.dependencies),
      JSON.stringify(manifest.excludePaths),
      JSON.stringify(manifest.requiredCommandScripts),
      manifest.inspectionFile,
      id,
    );
    env.DB.query("DELETE FROM skill_uploads WHERE id=?").run(input.fileId);
  })();
  return record;
}

export async function removeVersion(env: Env, skillId: string, versionId: string): Promise<void> {
  const row = env.DB.query("SELECT * FROM skill_versions WHERE id=? AND skill_id=?").get(
    versionId,
    skillId,
  ) as VersionRow | null;
  if (!row) {
    throw new ApiError(404, "版本不存在");
  }
  const skill = await read(env.DB, skillId);
  await env.SKILL_PACKS.delete(packageKey(skill, row.file_id));
  env.DB.query("DELETE FROM skill_versions WHERE id=?").run(row.id);
}

export function download(env: Env, fileId: string): string {
  const skill = env.DB.query(
    "SELECT s.id,s.game_id AS gameId FROM skill_versions v JOIN skills s ON s.id=v.skill_id WHERE v.file_id=? LIMIT 1",
  ).get(fileId) as Pick<SkillRecord, "id" | "gameId"> | null;
  if (!skill) {
    throw new ApiError(404, "文件不存在");
  }
  return env.SKILL_PACKS.download(packageKey(skill, fileId));
}
