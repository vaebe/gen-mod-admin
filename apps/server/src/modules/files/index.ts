import { Elysia } from "elysia";
import type { Env } from "../../env";
import { authGuard } from "../auth/guard";
import { SkillModel } from "../skills/model";
import { download } from "../skills/service";

export function fileRoutes(env: Env) {
  return new Elysia({ prefix: "/files" }).use(authGuard(env)).get(
    "/:fileId",
    async ({ params }) => {
      const object = await download(env, params.fileId);
      return new Response(object.body, {
        headers: {
          "content-type": "application/zip",
          "content-disposition": `attachment; filename="${params.fileId}.zip"`,
        },
      });
    },
    { authorize: "user", params: SkillModel.fileParams },
  );
}
