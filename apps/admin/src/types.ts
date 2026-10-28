export type {
  GameRecord,
  SkillRecord,
  SkillVersionRecord,
  ManifestFields,
  AuthUser,
  AuthTokens,
} from "../../../packages/contracts/src/index";
import type { SkillRecord, SkillVersionRecord } from "../../../packages/contracts/src/index";
export type CatalogSkill = SkillRecord & { versions: SkillVersionRecord[] };
export type CreateSkillPayload =
  | Omit<Extract<SkillRecord, { kind: "common" }>, "id">
  | Omit<Extract<SkillRecord, { kind: "game" }>, "id">;
export type SkillMetadataPayload = Pick<
  SkillRecord,
  "description" | "dependencies" | "excludePaths" | "requiredCommandScripts" | "inspectionFile"
>;
export interface CredentialsPayload {
  email: string;
  password: string;
}
