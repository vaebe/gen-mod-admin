<script setup lang="ts">
import type { CatalogSkill } from "@/types";

const selectedId = defineModel<string>({ required: true });
defineProps<{ skills: CatalogSkill[]; busy: boolean }>();
</script>

<template>
  <aside class="panel stack">
    <div class="section-heading">
      <h2>Skill 目录</h2>
      <button type="button" :disabled="busy" @click="selectedId = ''">新建</button>
    </div>
    <p v-if="busy && !skills.length" role="status" class="muted">正在加载 Skill…</p>
    <p v-else-if="!skills.length" class="muted">尚无官方 Skill</p>
    <button
      v-for="skill in skills"
      :key="skill.id"
      type="button"
      class="skill-choice"
      :class="{ active: skill.id === selectedId }"
      :aria-pressed="skill.id === selectedId"
      :disabled="busy"
      @click="selectedId = skill.id"
    >
      <strong>{{ skill.name }}</strong>
      <small
        >{{ skill.kind === "common" ? "通用" : skill.gameId }} ·
        {{ skill.versions.length }} 个版本</small
      >
    </button>
  </aside>
</template>
