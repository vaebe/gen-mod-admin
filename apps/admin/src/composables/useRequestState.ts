import { ref } from "vue";
import { errorMessage } from "@/api/base";

export function useRequestState() {
  const busy = ref(false);
  const error = ref("");
  const notice = ref("");

  async function run(action: () => Promise<void>): Promise<boolean> {
    if (busy.value) {
      return false;
    }
    busy.value = true;
    error.value = "";
    notice.value = "";
    try {
      await action();
      return true;
    } catch (cause) {
      error.value = errorMessage(cause);
      return false;
    } finally {
      busy.value = false;
    }
  }

  return { busy, error, notice, run };
}
