<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import type { GameRecord, SkillRecord } from '../../types'
defineProps<{ games: GameRecord[] }>()
const emit = defineEmits<{ save: [skill: Omit<SkillRecord, 'id'>] }>()
const form = reactive({ name: '', description: '', kind: 'common', gameId: '' })
const error = shallowRef('')
function submit() {
  error.value = ''
  if (form.kind === 'game' && !form.gameId) { error.value = '游戏 Skill 必须选择已有游戏'; return }
  emit('save', { name: form.name, description: form.description, kind: form.kind, gameId: form.kind === 'game' ? form.gameId : null, dependencies: [], excludePaths: [], requiredCommandScripts: [], inspectionFile: null } as Omit<SkillRecord, 'id'>)
}
</script>
<template>
  <form class="stack" @submit.prevent="submit">
    <label>Skill 名称<input v-model="form.name" name="name" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="64" required /><small>创建后不可更改</small></label>
    <label>说明<textarea v-model="form.description" name="description" required /></label>
    <label>类型<select v-model="form.kind" name="kind"><option value="common">通用 Skill</option><option value="game">游戏 Skill</option></select></label>
    <label v-if="form.kind === 'game'">绑定游戏<select v-model="form.gameId" name="gameId"><option value="">选择已有游戏</option><option v-for="game in games" :key="game.id" :value="game.id">{{ game.name }} · {{ game.id }}</option></select></label>
    <p v-if="error" role="alert" class="error">{{ error }}</p><button class="primary">创建 Skill</button>
  </form>
</template>
