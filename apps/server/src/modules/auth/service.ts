import type { Database } from "bun:sqlite";
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
  const existing = env.DB.query("SELECT id FROM users WHERE email=?").get(email);
  if (existing) {
    throw new ApiError(409, "邮箱已注册");
  }
  const user: UserRow = {
    id: crypto.randomUUID(),
    email,
    password_hash: await hashPassword(input.password),
    role: resolveRole(env.ADMIN_EMAILS, email),
  };
  env.DB.query("INSERT INTO users(id,email,password_hash,role,created_at) VALUES (?,?,?,?,?)").run(
    user.id,
    email,
    user.password_hash,
    user.role,
    new Date().toISOString(),
  );
  return publicUser(user);
}

export async function login(
  env: AuthEnvironment,
  input: Credentials,
): Promise<{ tokens: AuthTokens; sessionId: string }> {
  const user = env.DB.query("SELECT * FROM users WHERE email=?").get(
    input.email.trim().toLowerCase(),
  ) as UserRow | null;
  if (!user || !(await verifyPassword(input.password, user.password_hash))) {
    throw new ApiError(401, "邮箱或密码不正确");
  }
  user.role = resolveRole(env.ADMIN_EMAILS, user.email);
  env.DB.query("UPDATE users SET role=? WHERE id=?").run(user.role, user.id);
  const refreshToken = crypto.randomUUID() + crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  env.DB.query("INSERT INTO refresh_tokens VALUES (?,?,?,?)").run(
    crypto.randomUUID(),
    user.id,
    await digest(refreshToken),
    expires,
  );
  const sessionId = crypto.randomUUID();
  env.DB.query("INSERT INTO cookie_sessions VALUES (?,?,?)").run(sessionId, user.id, expires);
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
    const session = env.DB.query(
      "SELECT user_id FROM cookie_sessions WHERE id=? AND expires_at>?",
    ).get(credentials.sessionId, new Date().toISOString()) as { user_id: string } | null;
    userId = session?.user_id;
  }
  const user = userId
    ? (env.DB.query("SELECT * FROM users WHERE id=?").get(userId) as UserRow | null)
    : null;
  if (!user) {
    throw new ApiError(401, "登录凭证无效");
  }
  return { ...publicUser(user), id: user.id };
}

export async function refresh(env: AuthEnvironment, refreshToken: string): Promise<AuthTokens> {
  const token = env.DB.query(
    "SELECT user_id FROM refresh_tokens WHERE token_hash=? AND expires_at>?",
  ).get(await digest(refreshToken), new Date().toISOString()) as { user_id: string } | null;
  const user = token
    ? (env.DB.query("SELECT * FROM users WHERE id=?").get(token.user_id) as UserRow | null)
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
  db: Database,
  credentials: { refreshToken?: string; sessionId?: string },
): Promise<void> {
  if (credentials.refreshToken) {
    db.query("DELETE FROM refresh_tokens WHERE token_hash=?").run(
      await digest(credentials.refreshToken),
    );
  } else if (credentials.sessionId) {
    db.query("DELETE FROM cookie_sessions WHERE id=?").run(credentials.sessionId);
  }
}
