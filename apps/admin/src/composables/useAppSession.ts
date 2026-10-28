import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import type { AuthUser } from "@/types";
import { unauthorizedEvent } from "@/api/base";
import { navigationError } from "@/router";
import { clearSession, loggedIn, logout, user } from "@/stores/session";
import { useRequestState } from "./useRequestState";

export function useAppSession() {
  const router = useRouter();
  const { busy, error, run } = useRequestState();

  async function authenticated(value: AuthUser): Promise<void> {
    loggedIn(value);
    navigationError.value = "";
    await router.push(value.role === "admin" ? "/games" : "/");
  }

  function signOut(): Promise<boolean> {
    return run(async () => {
      await logout();
      await router.push("/login");
    });
  }

  function expire(): void {
    clearSession();
    void router.replace("/login");
  }

  onMounted(() => window.addEventListener(unauthorizedEvent, expire));
  onUnmounted(() => window.removeEventListener(unauthorizedEvent, expire));
  return { user, busy, error, authenticated, signOut };
}
