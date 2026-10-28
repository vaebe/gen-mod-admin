import { onBeforeUnmount, shallowRef } from "vue";

export interface Confirmation {
  title: string;
  description: string;
  action: string;
  destructive?: boolean;
}

export function useConfirmation() {
  const request = shallowRef<Confirmation | null>(null);
  let resolve: ((result: boolean) => void) | undefined;
  function answer(result: boolean): void {
    request.value = null;
    resolve?.(result);
    resolve = undefined;
  }
  function ask(options: Confirmation): Promise<boolean> {
    answer(false);
    request.value = options;
    return new Promise((done) => {
      resolve = done;
    });
  }
  onBeforeUnmount(() => answer(false));
  return { request, ask, answer };
}
