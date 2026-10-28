import { Elysia } from "elysia";
import type { Env } from "../../env";
import { authGuard } from "./guard";
import { AuthModel } from "./model";
import * as AuthService from "./service";

export function authRoutes(env: Env) {
  return new Elysia({ prefix: "/auth" })
    .use(authGuard(env))
    .guard({ cookie: AuthModel.sessionCookie })
    .post("/register", ({ body }) => AuthService.register(env, body), {
      body: AuthModel.credentials,
      response: { 200: AuthModel.user },
    })
    .post(
      "/login",
      async ({ body, cookie, request }) => {
        const result = await AuthService.login(env, body);
        cookie.gm_session.set({
          value: result.sessionId,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: new URL(request.url).protocol === "https:",
          maxAge: AuthService.SESSION_SECONDS,
          ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
        });
        return result.tokens;
      },
      { body: AuthModel.credentials, response: { 200: AuthModel.tokens } },
    )
    .get("/me", ({ user }) => AuthService.publicUser(user), {
      authorize: "user",
      response: { 200: AuthModel.user },
    })
    .post("/refresh", ({ body }) => AuthService.refresh(env, body.refreshToken), {
      body: AuthModel.refresh,
      response: { 200: AuthModel.tokens },
    })
    .post(
      "/logout",
      async ({ body, cookie, request }) => {
        await AuthService.logout(env.DB, {
          refreshToken: body.refreshToken,
          sessionId: cookie.gm_session.value,
        });
        if (!body.refreshToken) {
          cookie.gm_session.set({
            value: "",
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 0,
            secure: new URL(request.url).protocol === "https:",
            ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
          });
        }
        return { ok: true };
      },
      { body: AuthModel.logout },
    );
}
