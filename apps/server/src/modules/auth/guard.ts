import { Elysia } from "elysia";
import type { Env } from "../../env";
import { ApiError } from "../../errors";
import { AuthModel } from "./model";
import { authenticate } from "./service";

export function authGuard(env: Env) {
  return new Elysia({ name: "auth.guard" }).macro({
    authorize: (role: "user" | "admin") => ({
      cookie: AuthModel.sessionCookie,
      resolve: async ({ request, cookie }) => {
        const authorization = request.headers.get("authorization");
        const session = cookie.gm_session.value;
        const user = await authenticate(env, {
          accessToken: authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined,
          sessionId: typeof session === "string" ? session : undefined,
        });
        if (role === "admin" && user.role !== "admin") {
          throw new ApiError(403, "需要管理员权限");
        }
        return { user };
      },
    }),
  });
}
