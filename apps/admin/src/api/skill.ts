import type {
  CatalogSkill,
  CreateSkillPayload,
  SkillMetadataPayload,
  SkillRecord,
  SkillVersionRecord,
} from "@/types";
import type { PublishSkillPayload, SkillUpload } from "../../../../packages/contracts/src/index";
import { request } from "./base";

export function getSkills(): Promise<CatalogSkill[]> {
  return request.get("/skills");
}

export function createSkill(data: CreateSkillPayload): Promise<SkillRecord> {
  return request.post("/skills", data);
}

export function updateSkill(id: string, data: SkillMetadataPayload): Promise<SkillRecord> {
  return request.patch(`/skills/${encodeURIComponent(id)}`, data);
}

export function publishSkillVersion(
  id: string,
  data: PublishSkillPayload,
): Promise<SkillVersionRecord> {
  return request.post(`/skills/${encodeURIComponent(id)}/versions`, data);
}

export function deleteSkillVersion(skillId: string, versionId: string): Promise<{ ok: boolean }> {
  return request.delete(
    `/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(versionId)}`,
  );
}

export async function downloadSkillFile(fileId: string): Promise<Blob> {
  const { url } = await request.get<{ url: string }>(`/files/${encodeURIComponent(fileId)}/url`);
  const result = await fetch(url, { credentials: "omit" });
  if (!result.ok) {
    throw new Error(`七牛下载失败（${result.status}）`);
  }
  return result.blob();
}

export function requestSkillUpload(skillId: string): Promise<SkillUpload> {
  return request.post(`/skills/${encodeURIComponent(skillId)}/uploads`, {});
}

export function cleanupSkillUpload(skillId: string, fileId: string): Promise<{ ok: boolean }> {
  return request.delete(
    `/skills/${encodeURIComponent(skillId)}/uploads/${encodeURIComponent(fileId)}`,
  );
}

export async function uploadSkillFile(upload: SkillUpload, zip: Uint8Array): Promise<void> {
  const form = new FormData();
  form.set("key", upload.key);
  form.set("token", upload.token);
  form.set(
    "file",
    new Blob([new Uint8Array(zip).buffer], { type: "application/zip" }),
    "skill.zip",
  );
  const result = await fetch(upload.uploadUrl, { method: "POST", body: form, credentials: "omit" });
  if (!result.ok) {
    const body = (await result.json()) as { error?: string };
    throw new Error(`七牛上传失败：${body.error ?? result.status}`);
  }
}
