import { computed, onMounted, ref } from "vue";
import type { CatalogSkill, CreateSkillPayload, GameRecord } from "@/types";
import { getGames } from "@/api/game";
import { createSkill, getSkills } from "@/api/skill";
import { useRequestState } from "@/composables/useRequestState";

export function useSkills() {
  const skills = ref<CatalogSkill[]>([]);
  const games = ref<GameRecord[]>([]);
  const selectedId = ref("");
  const selected = computed(() => skills.value.find((skill) => skill.id === selectedId.value));
  const state = useRequestState();

  async function load(): Promise<void> {
    const [nextSkills, nextGames] = await Promise.all([getSkills(), getGames()]);
    skills.value = nextSkills;
    games.value = nextGames;
  }

  function reload(): Promise<boolean> {
    return state.run(load);
  }

  function create(data: CreateSkillPayload): Promise<boolean> {
    return state.run(async () => {
      const created = await createSkill(data);
      await load();
      selectedId.value = created.id;
    });
  }

  onMounted(reload);
  return { ...state, skills, games, selectedId, selected, reload, create };
}
