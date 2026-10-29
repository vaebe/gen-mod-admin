import type { Database } from "bun:sqlite";
import { openDatabase } from "./database";
import { QiniuStorage } from "./qiniu";

export interface Env {
  DB: Database;
  SKILL_PACKS: QiniuStorage;
  ADMIN_EMAILS: string;
  JWT_SECRET: string;
  COOKIE_DOMAIN?: string;
  COOKIE_SECURE?: boolean;
  CORS_ORIGINS?: string;
}

export function loadEnv(): Env {
  if (!process.env.JWT_SECRET) {
    throw new Error("请在 .env 中配置 JWT_SECRET");
  }
  return {
    DB: openDatabase(process.env.DATABASE_PATH),
    SKILL_PACKS: new QiniuStorage({
      accessKey: process.env.QINIU_ACCESS_KEY ?? "",
      secretKey: process.env.QINIU_SECRET_KEY ?? "",
      bucket: process.env.QINIU_BUCKET ?? "",
      uploadUrl: process.env.QINIU_UPLOAD_URL ?? "https://upload.qiniup.com",
      downloadUrl: process.env.QINIU_DOWNLOAD_URL ?? "",
      resourceUrl: process.env.QINIU_RESOURCE_URL ?? "https://rs.qiniu.com",
    }),
    ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",
    JWT_SECRET: process.env.JWT_SECRET,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
    COOKIE_SECURE: process.env.COOKIE_SECURE === "true" ? true : undefined,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
  };
}
