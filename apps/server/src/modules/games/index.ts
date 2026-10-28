import { Elysia } from "elysia";
import type { Env } from "../../env";
import { authGuard } from "../auth/guard";
import { GameModel } from "./model";
import * as GameService from "./service";

export function gameRoutes(env: Env) {
  return new Elysia({ prefix: "/games" })
    .use(authGuard(env))
    .get("", () => GameService.list(env.DB), {
      authorize: "user",
      response: { 200: GameModel.list },
    })
    .post("", ({ body }) => GameService.create(env.DB, body), {
      authorize: "admin",
      body: GameModel.create,
      response: { 200: GameModel.record },
    })
    .patch("/:id", ({ params, body }) => GameService.update(env.DB, params.id, body), {
      authorize: "admin",
      params: GameModel.params,
      body: GameModel.update,
      response: { 200: GameModel.record },
    })
    .delete(
      "/:id",
      async ({ params }) => {
        await GameService.remove(env.DB, params.id);
        return { ok: true };
      },
      { authorize: "admin", params: GameModel.params },
    );
}
