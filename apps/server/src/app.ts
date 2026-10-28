import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import type { Env } from "./env";
import { authRoutes } from "./modules/auth";
import { ApiError } from "./errors";
import { gameRoutes } from "./modules/games";
import { skillRoutes } from "./modules/skills";
import { fileRoutes } from "./modules/files";

export function createApp(env: Env) {
  return new Elysia({ adapter: CloudflareAdapter, normalize: "typebox" })
    .error({ API_ERROR: ApiError })
    .onError(({ code, error, set }) => {
      if (code === "API_ERROR") {
        set.status = error.status;
        return { error: error.message };
      }
    })
    .get("/", () => "Hello Elysia")
    .use(authRoutes(env))
    .use(gameRoutes(env))
    .use(skillRoutes(env))
    .use(fileRoutes(env))
    .compile();
}
