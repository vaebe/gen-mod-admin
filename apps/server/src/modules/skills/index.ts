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
    .post("/:id/versions", ({ params, body }) => SkillService.publish(env, params.id, body), {
      authorize: "admin",
      params: SkillModel.params,
      body: SkillModel.upload,
      response: { 200: SkillModel.version },
      error({ code, set }) {
        if (code === "VALIDATION" || code === "PARSE") {
          set.status = 400;
          return {
            error: "需要版本号和 zip 文件；清单字段需有效 JSON 数组或 inspectionFile 字符串/null",
          };
        }
      },
    })
    .delete(
      "/:id/versions/:versionId",
      async ({ params }) => {
        await SkillService.removeVersion(env, params.id, params.versionId);
        return { ok: true };
      },
      { authorize: "admin", params: SkillModel.versionParams },
    );
}
