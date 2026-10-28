<script setup lang="ts">
import type { GameRecord } from '../../types'
const model = defineModel<GameRecord>({ required: true })
defineProps<{ editing: boolean; busy: boolean }>()
const emit = defineEmits<{ save: []; cancel: [] }>()
</script>
<template>
  <form class="panel stack" @submit.prevent="emit('save')">
    <h2>{{ editing ? '编辑游戏' : '创建游戏' }}</h2>
    <label>游戏标识<input v-model="model.id" name="id" :disabled="editing" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="64" required /><small>创建后不可更改</small></label>
    <label>名称<input v-model="model.name" name="name" required /></label>
    <label>说明<textarea v-model="model.description" name="description" /></label>
    <div class="actions"><button class="primary" :disabled="busy">保存游戏</button><button v-if="editing" type="button" @click="emit('cancel')">取消编辑</button></div>
  </form>
</template>
