import type { AuthTokens, AuthUser, CredentialsPayload } from "@/types";
import { request } from "./base";

export function register(data: CredentialsPayload): Promise<AuthUser> {
  return request.post("/auth/register", data);
}

export function login(data: CredentialsPayload): Promise<AuthTokens> {
  return request.post("/auth/login", data);
}

export function getCurrentUser(): Promise<AuthUser> {
  return request.get("/auth/me");
}

export function signOut(): Promise<{ ok: boolean }> {
  return request.post("/auth/logout", {});
}
