<script setup lang="ts">
import { reactive, ref } from "vue";
import type { CreateSkillPayload, GameRecord, ManifestFields } from "@/types";

const { games, busy = false } = defineProps<{ games: GameRecord[]; busy?: boolean }>();
const emit = defineEmits<{ save: [skill: CreateSkillPayload] }>();
const form = reactive({
  name: "",
  description: "",
  kind: "common" as "common" | "game",
  gameId: "",
});
const error = ref("");

function submit(): void {
  error.value = "";
  const fields: ManifestFields = {
    dependencies: [],
    excludePaths: [],
    requiredCommandScripts: [],
    inspectionFile: null,
  };
  const base = { name: form.name, description: form.description, ...fields };
  if (form.kind === "game") {
    if (!games.some((game) => game.id === form.gameId)) {
      error.value = "游戏 Skill 必须选择已有游戏";
      return;
    }
    emit("save", { ...base, kind: "game", gameId: form.gameId });
  } else {
    emit("save", { ...base, kind: "common", gameId: null });
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <fieldset class="stack" :disabled="busy">
      <label>
        Skill 名称
        <input
          v-model="form.name"
          name="name"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxlength="64"
          required
        />
        <small>创建后不可更改</small>
      </label>
      <label>说明<textarea v-model="form.description" name="description" required /></label>
      <label>
        类型
        <select v-model="form.kind" name="kind">
          <option value="common">通用 Skill</option>
          <option value="game">游戏 Skill</option>
        </select>
      </label>
      <label v-if="form.kind === 'game'">
        绑定游戏
        <select v-model="form.gameId" name="gameId" required>
          <option value="">选择已有游戏</option>
          <option v-for="game in games" :key="game.id" :value="game.id">
            {{ game.name }} · {{ game.id }}
          </option>
        </select>
        <small v-if="!games.length">请先在游戏管理中创建游戏。</small>
      </label>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <button class="primary">{{ busy ? "正在创建…" : "创建 Skill" }}</button>
    </fieldset>
  </form>
</template>
