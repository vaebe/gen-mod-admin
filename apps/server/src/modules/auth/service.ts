import type { Env } from "../../env";
import type { AuthenticatedUser, AuthTokens, AuthUser, Credentials } from "./model";
import { ApiError } from "../../errors";
import { digest, hashPassword, verifyPassword } from "../../password";
import { createAccessToken, readAccessSubject } from "./token";

type AuthEnvironment = Pick<Env, "DB" | "ADMIN_EMAILS" | "JWT_SECRET">;
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: AuthUser["role"];
}

export const SESSION_SECONDS = 30 * 86400;

function resolveRole(adminEmails: string, email: string): AuthUser["role"] {
  const administrators = adminEmails.split(",").map((item) => item.trim().toLowerCase());
  return administrators.includes(email.toLowerCase()) ? "admin" : "user";
}

export function publicUser(user: AuthUser): AuthUser {
  return { email: user.email, role: user.role };
}

export async function register(env: AuthEnvironment, input: Credentials): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if (existing) {
    throw new ApiError(409, "邮箱已注册");
  }
  const user: UserRow = {
    id: crypto.randomUUID(),
    email,
    password_hash: await hashPassword(input.password),
    role: resolveRole(env.ADMIN_EMAILS, email),
  };
  await env.DB.prepare(
    "INSERT INTO users(id,email,password_hash,role,created_at) VALUES (?,?,?,?,?)",
  )
    .bind(user.id, email, user.password_hash, user.role, new Date().toISOString())
    .run();
  return publicUser(user);
}

export async function login(
  env: AuthEnvironment,
  input: Credentials,
): Promise<{ tokens: AuthTokens; sessionId: string }> {
  const user = await env.DB.prepare("SELECT * FROM users WHERE email=?")
    .bind(input.email.trim().toLowerCase())
    .first<UserRow>();
  if (!user || !(await verifyPassword(input.password, user.password_hash))) {
    throw new ApiError(401, "邮箱或密码不正确");
  }
  user.role = resolveRole(env.ADMIN_EMAILS, user.email);
  await env.DB.prepare("UPDATE users SET role=? WHERE id=?").bind(user.role, user.id).run();
  const refreshToken = crypto.randomUUID() + crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await env.DB.prepare("INSERT INTO refresh_tokens VALUES (?,?,?,?)")
    .bind(crypto.randomUUID(), user.id, await digest(refreshToken), expires)
    .run();
  const sessionId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO cookie_sessions VALUES (?,?,?)")
    .bind(sessionId, user.id, expires)
    .run();
  const accessToken = await createAccessToken(env.JWT_SECRET, user.id);
  return { tokens: { ...publicUser(user), accessToken, refreshToken }, sessionId };
}

export async function authenticate(
  env: AuthEnvironment,
  credentials: { accessToken?: string; sessionId?: string },
): Promise<AuthenticatedUser> {
  let userId: string | undefined;
  if (credentials.accessToken !== undefined) {
    userId = await readAccessSubject(env.JWT_SECRET, credentials.accessToken);
  } else if (credentials.sessionId) {
    const session = await env.DB.prepare(
      "SELECT user_id FROM cookie_sessions WHERE id=? AND expires_at>?",
    )
      .bind(credentials.sessionId, new Date().toISOString())
      .first<{ user_id: string }>();
    userId = session?.user_id;
  }
  const user = userId
    ? await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(userId).first<UserRow>()
    : null;
  if (!user) {
    throw new ApiError(401, "登录凭证无效");
  }
  return { ...publicUser(user), id: user.id };
}

export async function refresh(env: AuthEnvironment, refreshToken: string): Promise<AuthTokens> {
  const token = await env.DB.prepare(
    "SELECT user_id FROM refresh_tokens WHERE token_hash=? AND expires_at>?",
  )
    .bind(await digest(refreshToken), new Date().toISOString())
    .first<{ user_id: string }>();
  const user = token
    ? await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(token.user_id).first<UserRow>()
    : null;
  if (!user) {
    throw new ApiError(401, "登录凭证无效");
  }
  return {
    ...publicUser(user),
    accessToken: await createAccessToken(env.JWT_SECRET, user.id),
    refreshToken,
  };
}

export async function logout(
  db: D1Database,
  credentials: { refreshToken?: string; sessionId?: string },
): Promise<void> {
  if (credentials.refreshToken) {
    await db
      .prepare("DELETE FROM refresh_tokens WHERE token_hash=?")
      .bind(await digest(credentials.refreshToken))
      .run();
  } else if (credentials.sessionId) {
    await db.prepare("DELETE FROM cookie_sessions WHERE id=?").bind(credentials.sessionId).run();
  }
}
