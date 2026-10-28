import { shallowRef } from "vue";
import type { AuthUser } from "@/types";
import { getCurrentUser, signOut } from "@/api/auth";
import { ApiError } from "@/api/base";

export const user = shallowRef<AuthUser | null>(null);
let loaded = false;

export async function loadUser(): Promise<AuthUser | null> {
  if (!loaded) {
    try {
      user.value = await getCurrentUser();
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status !== 401) {
        throw cause;
      }
      user.value = null;
    }
    loaded = true;
  }
  return user.value;
}

export function loggedIn(value: AuthUser): void {
  // 后台只保留公开用户信息；令牌不进入浏览器状态。
  user.value = { email: value.email, role: value.role };
  loaded = true;
}

export function clearSession(): void {
  user.value = null;
  loaded = true;
}

export async function logout(): Promise<void> {
  await signOut();
  clearSession();
}
