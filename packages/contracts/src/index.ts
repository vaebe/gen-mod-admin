export const MAX_SKILL_ZIP_BYTES = 10_000_000

export interface SkillUpload {
  fileId: string
  key: string
  uploadUrl: string
  token: string
}

export interface PublishSkillPayload extends ManifestFields {
  version: string
  description: string
  fileId: string
  contentHash: string
}


export interface GameRecord {
  id: string
  name: string
  description: string
}

export interface ManifestFields {
  dependencies: string[]
  excludePaths: string[]
  requiredCommandScripts: string[]
  inspectionFile: string | null
}

export type SkillRecord = ManifestFields & {
  id: string
  name: string
  description: string
} & ({ kind: 'common'; gameId: null } | { kind: 'game'; gameId: string })

export type ManifestSnapshot = ManifestFields & { version: string } & (
  { category: 'common'; gameId: null } | { category: 'game'; gameId: string }
)

export interface SkillVersionRecord {
  id: string
  skillId: string
  version: string
  contentHash: string
  fileId: string
  uploadedAt: string
  manifest: ManifestSnapshot
}

export interface AuthUser {
  email: string
  role: 'user' | 'admin'
}

export interface AuthTokens extends AuthUser {
  accessToken: string
  refreshToken: string
}
