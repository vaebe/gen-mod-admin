import { onMounted, ref } from "vue";
import type { GameRecord } from "@/types";
import { createGame, deleteGame, getGames, updateGame } from "@/api/game";
import { useRequestState } from "@/composables/useRequestState";

function emptyGame(): GameRecord {
  return { id: "", name: "", description: "" };
}

export function useGames() {
  const games = ref<GameRecord[]>([]);
  const form = ref(emptyGame());
  const editing = ref(false);
  const state = useRequestState();

  async function load(): Promise<void> {
    games.value = await getGames();
  }

  function clear(): void {
    form.value = emptyGame();
    editing.value = false;
  }

  function edit(game: GameRecord): void {
    form.value = { ...game };
    editing.value = true;
  }

  function save(): Promise<boolean> {
    return state.run(async () => {
      if (editing.value) {
        await updateGame(form.value.id, {
          name: form.value.name,
          description: form.value.description,
        });
      } else {
        await createGame(form.value);
      }
      clear();
      await load();
      state.notice.value = "游戏已保存";
    });
  }

  function remove(game: GameRecord): Promise<boolean> {
    return state.run(async () => {
      await deleteGame(game.id);
      await load();
      state.notice.value = "游戏已删除";
    });
  }

  function reload(): Promise<boolean> {
    return state.run(load);
  }

  onMounted(reload);
  return { ...state, games, form, editing, clear, edit, save, remove, reload };
}
