import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import type { Env } from "./env";
import { authRoutes } from "./modules/auth";
import { ApiError } from "./errors";
import { gameRoutes } from "./modules/games";
import { skillRoutes } from "./modules/skills";
import { fileRoutes } from "./modules/files";

export function createApp(env: Env) {
  const origins = (env.CORS_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Elysia({ normalize: "typebox" })
    .use(
      cors({
        origin: (request) => origins.includes(request.headers.get("origin") ?? ""),
        credentials: true,
        methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["Content-Disposition"],
      }),
    )
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
