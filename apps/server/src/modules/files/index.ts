import { Elysia } from "elysia";
import type { Env } from "../../env";
import { authGuard } from "../auth/guard";
import { SkillModel } from "../skills/model";
import { download } from "../skills/service";

export function fileRoutes(env: Env) {
  return new Elysia({ prefix: "/files" })
    .use(authGuard(env))
    .get("/:fileId/url", ({ params }) => ({ url: download(env, params.fileId) }), {
      authorize: "user",
      params: SkillModel.fileParams,
    })
    .get("/:fileId", ({ params, redirect }) => redirect(download(env, params.fileId)), {
      authorize: "user",
      params: SkillModel.fileParams,
    });
}
