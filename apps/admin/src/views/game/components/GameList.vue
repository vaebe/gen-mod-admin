<script setup lang="ts">
import { Gamepad2, Pencil, Trash2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import type { GameRecord } from "@/types";
defineProps<{ games: GameRecord[]; busy: boolean }>();
const emit = defineEmits<{ edit: [game: GameRecord]; remove: [game: GameRecord] }>();
</script>
<template>
  <section class="surface">
    <div class="flex items-center justify-between border-b px-5 py-4">
      <h2>游戏目录</h2>
      <span class="text-xs text-muted-foreground">{{ games.length }} 个游戏</span>
    </div>
    <div v-if="busy && !games.length" role="status" class="p-6">
      <div class="h-24 animate-pulse rounded bg-muted" />
      <span class="sr-only">正在加载游戏…</span>
    </div>
    <div v-else-if="!games.length" class="empty">
      <Gamepad2 :size="36" :stroke-width="1.2" />
      <h2 class="text-foreground">添加第一个游戏</h2>
      <p>创建游戏后即可为它绑定官方 Skill。通用 Skill 无需绑定游戏。</p>
    </div>
    <div v-else class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>游戏名称</th>
            <th>游戏标识</th>
            <th>说明</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="game in games" :key="game.id">
            <td class="min-w-40 font-medium">{{ game.name }}</td>
            <td class="font-mono text-xs text-muted-foreground">{{ game.id }}</td>
            <td class="min-w-48 max-w-lg text-xs text-muted-foreground">
              {{ game.description || "—" }}
            </td>
            <td>
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="sm" :disabled="busy" @click="emit('edit', game)"
                  ><Pencil :size="14" />编辑</Button
                ><Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-destructive"
                  :aria-label="`删除 ${game.name}`"
                  :disabled="busy"
                  @click="emit('remove', game)"
                  ><Trash2 :size="15"
                /></Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
