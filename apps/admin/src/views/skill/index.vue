<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { useSkills } from "./composables/useSkills";

const SkillForm = defineAsyncComponent(() => import("./components/SkillForm.vue"));
const SkillEditor = defineAsyncComponent(() => import("./components/SkillEditor.vue"));
const SkillCatalog = defineAsyncComponent(() => import("./components/SkillCatalog.vue"));
const { skills, games, selectedId, selected, error, busy, reload, create } = useSkills();
</script>

<template>
  <header class="page-heading">
    <div>
      <p class="eyebrow">REGISTRY / SKILLS</p>
      <h1>官方 Skill</h1>
      <p class="muted">管理官方 Skill 的说明、文件和发布版本。</p>
    </div>
    <span class="count mono">{{ skills.length.toString().padStart(2, "0") }}</span>
  </header>
  <div v-if="error" role="alert" class="error actions">
    <span>{{ error }}</span>
    <button type="button" :disabled="busy" @click="reload">重新加载</button>
  </div>
  <div class="skill-layout">
    <SkillCatalog v-model="selectedId" :skills="skills" :busy="busy" />
    <SkillEditor v-if="selected" :key="selected.id" :skill="selected" @changed="reload" />
    <section v-else class="panel stack">
      <h2>创建 Skill</h2>
      <p class="muted">通用 Skill 无需游戏；游戏 Skill 必须绑定已有游戏。</p>
      <SkillForm :games="games" :busy="busy" @save="create" />
    </section>
  </div>
</template>
