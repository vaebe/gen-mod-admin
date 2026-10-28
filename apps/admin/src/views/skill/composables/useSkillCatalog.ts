import { computed, shallowRef } from "vue";
import type { CatalogSkill } from "@/types";

export function filterSkills(skills: CatalogSkill[], game: string, query: string): CatalogSkill[] {
  const term = query.trim().toLowerCase();
  return skills.filter(
    (skill) =>
      (game === "all" ||
        (game === "common" ? skill.kind === "common" : `game:${skill.gameId}` === game)) &&
      (!term || `${skill.name} ${skill.description}`.toLowerCase().includes(term)),
  );
}

export function useSkillCatalog(getSkills: () => CatalogSkill[]) {
  const query = shallowRef("");
  const game = shallowRef("all");
  const filtered = computed(() => filterSkills(getSkills(), game.value, query.value));
  return { query, game, filtered };
}
