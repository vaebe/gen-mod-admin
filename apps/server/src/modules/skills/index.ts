import { Elysia } from "elysia";
import type { Env } from "../../env";
import { authGuard } from "../auth/guard";
import { SkillModel } from "./model";
import * as SkillService from "./service";

export function skillRoutes(env: Env) {
  return new Elysia({ prefix: "/skills" })
    .use(authGuard(env))
    .get("", () => SkillService.list(env.DB), {
      authorize: "user",
      response: { 200: SkillModel.list },
    })
    .post("", ({ body }) => SkillService.create(env.DB, body), {
      authorize: "admin",
      body: SkillModel.create,
      response: { 200: SkillModel.record },
    })
    .patch("/:id", ({ params, body }) => SkillService.update(env.DB, params.id, body), {
      authorize: "admin",
      params: SkillModel.params,
      body: SkillModel.update,
      response: { 200: SkillModel.record },
    })
    .post(
      "/:id/uploads",
      ({ params, user }) => SkillService.requestUpload(env, params.id, user.id),
      {
        authorize: "admin",
        params: SkillModel.params,
      },
    )
    .delete(
      "/:id/uploads/:fileId",
      ({ params, user }) => SkillService.cleanupUpload(env, params.id, params.fileId, user.id),
      {
        authorize: "admin",
        params: SkillModel.uploadParams,
      },
    )
    .post(
      "/:id/versions",
      ({ params, body, user }) => SkillService.publish(env, params.id, body, user.id),
      {
        authorize: "admin",
        params: SkillModel.params,
        body: SkillModel.upload,
        response: { 200: SkillModel.version },
        error({ code, set }) {
          if (code === "VALIDATION" || code === "PARSE") {
            set.status = 400;
            return {
              error: "版本号、文件 ID、内容哈希或清单格式无效",
            };
          }
        },
      },
    )
    .delete(
      "/:id/versions/:versionId",
      async ({ params }) => {
        await SkillService.removeVersion(env, params.id, params.versionId);
        return { ok: true };
      },
      { authorize: "admin", params: SkillModel.versionParams },
    );
}
