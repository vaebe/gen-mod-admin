<script setup lang="ts">
import type { GameRecord } from "@/types";

defineProps<{ games: GameRecord[]; busy: boolean }>();
const emit = defineEmits<{ edit: [game: GameRecord]; remove: [game: GameRecord] }>();
</script>

<template>
  <section class="panel">
    <h2>游戏目录</h2>
    <p v-if="busy && !games.length" role="status" class="empty">正在加载游戏…</p>
    <p v-else-if="!games.length" class="empty">尚未创建游戏。通用 Skill 仍可直接创建。</p>
    <article v-for="game in games" :key="game.id" class="list-row">
      <div>
        <h3>{{ game.name }}</h3>
        <code>{{ game.id }}</code>
        <p class="muted">{{ game.description }}</p>
      </div>
      <div class="actions">
        <button type="button" :disabled="busy" @click="emit('edit', game)">编辑</button>
        <button type="button" class="danger" :disabled="busy" @click="emit('remove', game)">
          删除
        </button>
      </div>
    </article>
  </section>
</template>
