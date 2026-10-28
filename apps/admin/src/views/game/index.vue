<script setup lang="ts">
import { defineAsyncComponent, shallowRef } from "vue";
import { Plus, RefreshCw } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { GameRecord } from "@/types";
import { useConfirmation } from "@/composables/useConfirmation";
import { useGames } from "./composables/useGames";
const GameForm = defineAsyncComponent(() => import("./components/GameForm.vue"));
const GameList = defineAsyncComponent(() => import("./components/GameList.vue"));
const ConfirmDialog = defineAsyncComponent(() => import("@/components/ConfirmDialog.vue"));
const { games, form, editing, busy, error, notice, clear, edit, save, remove, reload } = useGames();
const open = shallowRef(false);
const confirmation = useConfirmation();
function create(): void {
  clear();
  open.value = true;
}
function startEdit(game: GameRecord): void {
  edit(game);
  open.value = true;
}
async function submit(): Promise<void> {
  if (await save()) {
    open.value = false;
  }
}
async function removeGame(game: GameRecord): Promise<void> {
  if (
    await confirmation.ask({
      title: `删除“${game.name}”？`,
      description: "仍有 Skill 绑定时服务端会拒绝删除。删除后不能恢复此游戏记录。",
      action: "删除游戏",
      destructive: true,
    })
  ) {
    await remove(game);
  }
}
</script>
<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>游戏管理</h1>
        <p class="page-description">维护支持的游戏，为官方 Skill 提供统一的游戏标识。</p>
      </div>
      <div class="actions">
        <Button variant="outline" size="icon" aria-label="刷新游戏" :disabled="busy" @click="reload"
          ><RefreshCw :size="16" :class="{ 'animate-spin': busy }" /></Button
        ><Button @click="create"><Plus :size="16" />新增游戏</Button>
      </div>
    </header>
    <div v-if="error && !open" role="alert" class="error">
      <span>{{ error }}</span
      ><Button variant="outline" size="sm" :disabled="busy" @click="reload">重新加载</Button>
    </div>
    <p v-if="notice" role="status" class="notice">{{ notice }}</p>
    <GameList :games="games" :busy="busy" @edit="startEdit" @remove="removeGame" />
    <Dialog :open="open" @update:open="!busy && (open = $event)"
      ><DialogContent
        class="max-w-lg"
        :show-close-button="!busy"
        @interact-outside="busy && $event.preventDefault()"
        @escape-key-down="busy && $event.preventDefault()"
        ><DialogHeader
          ><DialogTitle>{{ editing ? "编辑游戏" : "新增游戏" }}</DialogTitle
          ><DialogDescription
            >游戏标识用于绑定官方 Skill，创建后不可更改。</DialogDescription
          ></DialogHeader
        >
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <GameForm
          v-model="form"
          :editing="editing"
          :busy="busy"
          @save="submit"
          @cancel="open = false" /></DialogContent
    ></Dialog>
    <ConfirmDialog :request="confirmation.request.value" @answer="confirmation.answer" />
  </div>
</template>
