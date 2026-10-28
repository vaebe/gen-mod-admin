import { t } from "elysia";

const userFields = {
  email: t.String(),
  role: t.Union([t.Literal("user"), t.Literal("admin")]),
};

export const AuthModel = {
  credentials: t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 1 }),
  }),
  refresh: t.Object({ refreshToken: t.String() }),
  logout: t.Object({ refreshToken: t.Optional(t.String()) }),
  sessionCookie: t.Cookie({ gm_session: t.Optional(t.String()) }),
  user: t.Object(userFields),
  tokens: t.Object({
    ...userFields,
    accessToken: t.String(),
    refreshToken: t.String(),
  }),
} as const;

export type Credentials = typeof AuthModel.credentials.static;
export type AuthUser = typeof AuthModel.user.static;
export type AuthTokens = typeof AuthModel.tokens.static;
export type AuthenticatedUser = AuthUser & { id: string };
