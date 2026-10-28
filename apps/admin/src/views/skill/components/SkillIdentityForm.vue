<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GameRecord } from "@/types";
import type { SkillIdentity } from "../composables/useSkillWorkspace";
const identity = defineModel<SkillIdentity>({ required: true });
const description = defineModel<string>("description", { required: true });
defineProps<{ games: GameRecord[]; busy: boolean }>();
const emit = defineEmits<{ save: [] }>();
</script>

<template>
  <form
    id="skill-identity"
    class="surface mb-5 grid gap-5 p-5 grid-cols-2"
    @submit.prevent="emit('save')"
  >
    <label class="field"
      >Skill 名称<Input
        v-model="identity.name"
        name="name"
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        maxlength="64"
        placeholder="例如 game-modding"
        :disabled="busy"
        required
      /><span class="field-hint">小写字母、数字和连字符，创建后不可更改。</span></label
    >
    <div class="grid grid-cols-2 gap-3">
      <label class="field content-start"
        >类型<select v-model="identity.kind" name="kind" class="form-select" :disabled="busy">
          <option value="common">通用 Skill</option>
          <option value="game">游戏 Skill</option>
        </select></label
      ><label v-if="identity.kind === 'game'" class="field content-start"
        >绑定游戏<select
          v-model="identity.gameId"
          name="gameId"
          class="form-select"
          :disabled="busy"
          required
        >
          <option value="">选择已有游戏</option>
          <option v-for="game in games" :key="game.id" :value="game.id">
            {{ game.name }}
          </option></select
        ><span v-if="!games.length" class="field-hint">请先在游戏管理中创建游戏。</span></label
      >
    </div>
    <label class="field col-span-2"
      >说明<Textarea
        v-model="description"
        name="description"
        rows="2"
        placeholder="描述此 Skill 提供的能力"
        :disabled="busy"
        required
      /><span class="field-hint"
        >默认 SKILL.md 会同步这份说明，开始人工编辑后不再自动覆盖。</span
      ></label
    >
  </form>
</template>
