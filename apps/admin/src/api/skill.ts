import type {
  CatalogSkill,
  CreateSkillPayload,
  SkillMetadataPayload,
  SkillRecord,
  SkillVersionRecord,
} from "@/types";
import { request, response } from "./base";

export function getSkills(): Promise<CatalogSkill[]> {
  return request.get("/skills");
}

export function createSkill(data: CreateSkillPayload): Promise<SkillRecord> {
  return request.post("/skills", data);
}

export function updateSkill(id: string, data: SkillMetadataPayload): Promise<SkillRecord> {
  return request.patch(`/skills/${encodeURIComponent(id)}`, data);
}

export function publishSkillVersion(id: string, data: FormData): Promise<SkillVersionRecord> {
  return request.post(`/skills/${encodeURIComponent(id)}/versions`, data);
}

export function deleteSkillVersion(skillId: string, versionId: string): Promise<{ ok: boolean }> {
  return request.delete(
    `/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(versionId)}`,
  );
}

export async function downloadSkillFile(fileId: string): Promise<Blob> {
  const result = await response(`/files/${encodeURIComponent(fileId)}`);
  return result.blob();
}
