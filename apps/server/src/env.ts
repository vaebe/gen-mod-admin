declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      SKILL_PACKS: R2Bucket;
      ADMIN_EMAILS: string;
      JWT_SECRET: string;
      COOKIE_DOMAIN?: string;
      CORS_ORIGINS?: string;
    }
  }
}

export type Env = Cloudflare.Env;
