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
import { hashAndValidate } from "../../skill-package";
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

async function versions(db: D1Database, skillId: string): Promise<SkillVersionRecord[]> {
  const result = await db
    .prepare("SELECT * FROM skill_versions WHERE skill_id=? ORDER BY uploaded_at DESC,id DESC")
    .bind(skillId)
    .all<VersionRow>();
  return result.results.map(versionRecord);
}

export async function read(db: D1Database, id: string): Promise<SkillRecord> {
  const row = await db.prepare("SELECT * FROM skills WHERE id=?").bind(id).first<SkillRow>();
  if (!row) {
    throw new ApiError(404, "Skill 不存在");
  }
  return skillRecord(row);
}

export async function list(db: D1Database): Promise<CatalogSkill[]> {
  const result = await db.prepare("SELECT * FROM skills ORDER BY created_at,id").all<SkillRow>();
  return Promise.all(
    result.results.map(async (row) => ({
      ...skillRecord(row),
      versions: await versions(db, row.id),
    })),
  );
}

export async function create(db: D1Database, input: CreateSkill): Promise<SkillRecord> {
  if (!validName(input.name)) {
    throw new ApiError(400, "Skill 名称无效");
  }
  const validBinding =
    input.kind === "common"
      ? input.gameId === null
      : input.gameId &&
        (await db.prepare("SELECT id FROM games WHERE id=?").bind(input.gameId).first());
  if (!validBinding) {
    throw new ApiError(400, "游戏 Skill 必须绑定已有游戏；通用 Skill 不绑定游戏");
  }
  if (await db.prepare("SELECT id FROM skills WHERE name=?").bind(input.name).first()) {
    throw new ApiError(409, "Skill 名称已存在");
  }
  const id = crypto.randomUUID();
  await db
    .prepare(`
    INSERT INTO skills(id,name,description,kind,game_id,dependencies,exclude_paths,required_command_scripts,inspection_file,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `)
    .bind(
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
    )
    .run();
  return read(db, id);
}

export async function update(db: D1Database, id: string, input: UpdateSkill): Promise<SkillRecord> {
  const old = await read(db, id);
  await db
    .prepare(`
    UPDATE skills SET description=?,dependencies=?,exclude_paths=?,required_command_scripts=?,inspection_file=?
    WHERE id=?
  `)
    .bind(
      input.description,
      JSON.stringify(input.dependencies ?? old.dependencies),
      JSON.stringify(input.excludePaths ?? old.excludePaths),
      JSON.stringify(input.requiredCommandScripts ?? old.requiredCommandScripts),
      input.inspectionFile === undefined ? old.inspectionFile : input.inspectionFile,
      id,
    )
    .run();
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

export async function publish(
  env: Pick<Env, "DB" | "SKILL_PACKS">,
  id: string,
  input: PublishSkill,
): Promise<SkillVersionRecord> {
  const skill = await read(env.DB, id);
  const current = await versions(env.DB, id);
  if (current.length >= MAX_VERSIONS) {
    throw new ApiError(409, "最多 5 个版本，请先移除旧版本");
  }
  if (!input.version.trim()) {
    throw new ApiError(400, "需要版本号和 zip 文件");
  }
  if (current.some((item) => item.version === input.version)) {
    throw new ApiError(409, "版本号已存在；内容变更请提高版本号");
  }
  const description = input.description ?? skill.description;
  if (!description.trim()) {
    throw new ApiError(400, "需要 Skill 说明");
  }
  const manifest = manifestFor(skill, input);
  const bytes = new Uint8Array(await input.zip.arrayBuffer());
  let contentHash: string;
  try {
    contentHash = await hashAndValidate(bytes, manifest, { name: skill.name, description });
  } catch (cause) {
    throw new ApiError(400, cause instanceof Error ? cause.message : "zip 校验失败");
  }
  const record: SkillVersionRecord = {
    id: crypto.randomUUID(),
    skillId: skill.id,
    version: input.version,
    contentHash,
    fileId: crypto.randomUUID(),
    uploadedAt: new Date().toISOString(),
    manifest,
  };
  await env.SKILL_PACKS.put(record.fileId, bytes);
  await saveVersion(env.DB, record, description);
  return record;
}

async function saveVersion(
  db: D1Database,
  record: SkillVersionRecord,
  description: string,
): Promise<void> {
  const manifest = record.manifest;
  // R2 已写入。条件插入和元数据更新属于同一 D1 batch，失败时列表与清单均不变。
  const results = await db.batch([
    db
      .prepare(`
      INSERT INTO skill_versions(id,skill_id,version,content_hash,file_id,uploaded_at,manifest)
      SELECT ?,?,?,?,?,?,?
      WHERE (SELECT COUNT(*) FROM skill_versions WHERE skill_id=?)<?
        AND NOT EXISTS (SELECT 1 FROM skill_versions WHERE skill_id=? AND version=?)
    `)
      .bind(
        record.id,
        record.skillId,
        record.version,
        record.contentHash,
        record.fileId,
        record.uploadedAt,
        JSON.stringify(manifest),
        record.skillId,
        MAX_VERSIONS,
        record.skillId,
        record.version,
      ),
    db
      .prepare(`
      UPDATE skills SET description=?,dependencies=?,exclude_paths=?,required_command_scripts=?,inspection_file=?
      WHERE id=? AND EXISTS (SELECT 1 FROM skill_versions WHERE id=?)
    `)
      .bind(
        description,
        JSON.stringify(manifest.dependencies),
        JSON.stringify(manifest.excludePaths),
        JSON.stringify(manifest.requiredCommandScripts),
        manifest.inspectionFile,
        record.skillId,
        record.id,
      ),
  ]);
  if (results[0].meta.changes === 0) {
    const duplicate = await db
      .prepare("SELECT id FROM skill_versions WHERE skill_id=? AND version=?")
      .bind(record.skillId, record.version)
      .first();
    throw new ApiError(
      409,
      duplicate ? "版本号已存在；内容变更请提高版本号" : "最多 5 个版本，请先移除旧版本",
    );
  }
}

export async function removeVersion(
  env: Pick<Env, "DB" | "SKILL_PACKS">,
  skillId: string,
  versionId: string,
): Promise<void> {
  const row = await env.DB.prepare("SELECT * FROM skill_versions WHERE id=? AND skill_id=?")
    .bind(versionId, skillId)
    .first<VersionRow>();
  if (!row) {
    throw new ApiError(404, "版本不存在");
  }
  await env.DB.prepare("DELETE FROM skill_versions WHERE id=?").bind(row.id).run();
  const referenced = await env.DB.prepare("SELECT id FROM skill_versions WHERE file_id=? LIMIT 1")
    .bind(row.file_id)
    .first();
  if (!referenced) {
    await env.SKILL_PACKS.delete(row.file_id);
  }
}

export async function download(
  env: Pick<Env, "DB" | "SKILL_PACKS">,
  fileId: string,
): Promise<R2ObjectBody> {
  const referenced = await env.DB.prepare("SELECT id FROM skill_versions WHERE file_id=? LIMIT 1")
    .bind(fileId)
    .first();
  if (!referenced) {
    throw new ApiError(404, "文件不存在");
  }
  const object = await env.SKILL_PACKS.get(fileId);
  if (!object) {
    throw new ApiError(404, "文件不存在");
  }
  return object;
}
