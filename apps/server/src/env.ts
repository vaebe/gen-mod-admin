export interface Env {
  DB: D1Database
  SKILL_PACKS: R2Bucket
  ADMIN_EMAILS: string
  JWT_SECRET: string
  COOKIE_DOMAIN?: string
}
