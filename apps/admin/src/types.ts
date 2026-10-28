export type { GameRecord, SkillRecord, SkillVersionRecord, ManifestFields, AuthUser } from '../../../packages/contracts/src/index'
import type { SkillRecord, SkillVersionRecord } from '../../../packages/contracts/src/index'
export type CatalogSkill = SkillRecord & { versions: SkillVersionRecord[] }
