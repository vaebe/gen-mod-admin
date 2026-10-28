import { onMounted, ref } from "vue";
import type { CatalogSkill, GameRecord } from "@/types";
import { getGames } from "@/api/game";
import { getSkills } from "@/api/skill";
import { useRequestState } from "@/composables/useRequestState";

export function useSkills() {
  const skills = ref<CatalogSkill[]>([]);
  const games = ref<GameRecord[]>([]);
  const state = useRequestState();

  async function load(): Promise<void> {
    const [nextSkills, nextGames] = await Promise.all([getSkills(), getGames()]);
    skills.value = nextSkills;
    games.value = nextGames;
  }

  function reload(): Promise<boolean> {
    return state.run(load);
  }

  onMounted(reload);
  return { ...state, skills, games, reload };
}
