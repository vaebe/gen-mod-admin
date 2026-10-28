<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { ChevronRight, ArrowLeft } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { getSkills } from "@/api/skill";
import { getGames } from "@/api/game";
import { useRequestState } from "@/composables/useRequestState";
import { useConfirmation } from "@/composables/useConfirmation";
import type { CatalogSkill, GameRecord } from "@/types";
import { user } from "@/stores/session";

const SkillEditor = defineAsyncComponent(() => import("./components/SkillEditor.vue"));
const ConfirmDialog = defineAsyncComponent(() => import("@/components/ConfirmDialog.vue"));
const route = useRoute();
const router = useRouter();
const skill = shallowRef<CatalogSkill | null>(null);
const games = shallowRef<GameRecord[]>([]);
const { busy, error, run } = useRequestState();
const documentDirty = shallowRef(false);
const documentBusy = shallowRef(false);
const confirmation = useConfirmation();
function canLeave(): Promise<boolean> | boolean {
  if (documentBusy.value) {
    return false;
  }
  return (
    !documentDirty.value ||
    confirmation.ask({
      title: "离开编辑页面？",
      description: "当前未发布的文件和未保存的清单修改将丢失。",
      action: "放弃修改并离开",
    })
  );
}
onBeforeRouteLeave(
  (to) =>
    (to.path === "/login" && !user.value) ||
    (to.name === "skill-edit" && to.params.id === skill.value?.id) ||
    canLeave(),
);
onBeforeRouteUpdate((to) => String(to.params.id || "") === skill.value?.id || canLeave());
function beforeUnload(event: BeforeUnloadEvent): void {
  if (documentDirty.value || documentBusy.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
const emptySkill: CatalogSkill = {
  id: "",
  name: "",
  description: "",
  kind: "common",
  gameId: null,
  dependencies: [],
  excludePaths: [],
  requiredCommandScripts: [],
  inspectionFile: null,
  versions: [],
};

function load(): Promise<boolean> {
  return run(async () => {
    const [catalog, gameList] = await Promise.all([getSkills(), getGames()]);
    games.value = gameList;
    const id = String(route.params.id || "");
    const found = id ? catalog.find((item) => item.id === id) : { ...emptySkill };
    if (!found) {
      throw new Error("此 Skill 不存在，请返回列表重新选择。");
    }
    skill.value = found;
  });
}
watch(
  () => route.params.id,
  () => {
    if (String(route.params.id || "") !== skill.value?.id) {
      skill.value = null;
      void load();
    }
  },
  { immediate: true },
);
async function created(next: CatalogSkill): Promise<void> {
  skill.value = next;
  await router.replace({ name: "skill-edit", params: { id: next.id } });
}
</script>

<template>
  <div>
    <nav class="page-breadcrumb" aria-label="面包屑">
      <RouterLink to="/skills">Skill 管理</RouterLink><ChevronRight :size="12" /><span>{{
        skill?.id ? skill.name : "新增 Skill"
      }}</span>
    </nav>
    <div v-if="error" role="alert" class="error">
      <span>{{ error }}</span
      ><Button variant="outline" size="sm" :disabled="busy" @click="load">重新加载</Button
      ><Button as-child variant="ghost" size="sm"
        ><RouterLink to="/skills"><ArrowLeft :size="14" />返回列表</RouterLink></Button
      >
    </div>
    <div v-if="busy && !skill" role="status" class="grid gap-5">
      <div class="h-12 w-64 animate-pulse rounded bg-muted" />
      <div class="h-[560px] animate-pulse rounded-lg bg-muted" />
      <span class="sr-only">正在加载 Skill…</span>
    </div>
    <SkillEditor
      v-if="skill"
      :skill="skill"
      :games="games"
      @changed="load"
      @created="created"
      @dirty="documentDirty = $event"
      @busy="documentBusy = $event"
    />
    <ConfirmDialog :request="confirmation.request.value" @answer="confirmation.answer" />
  </div>
</template>
