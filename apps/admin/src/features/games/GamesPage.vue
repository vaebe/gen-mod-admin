<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import type { GameRecord } from '../../types'
import { api, message } from '../../lib/api'
import GameForm from './GameForm.vue'
const games = ref<GameRecord[]>([])
const form = ref<GameRecord>({ id: '', name: '', description: '' })
const editing = shallowRef(false); const busy = shallowRef(false); const error = shallowRef('')
async function load() { games.value = await api<GameRecord[]>('/games') }
async function run(action: () => Promise<void>) { busy.value = true; error.value = ''; try { await action() } catch (cause) { error.value = message(cause) } finally { busy.value = false } }
function clear() { form.value = { id: '', name: '', description: '' }; editing.value = false }
function save() { return run(async () => {
  if (editing.value) { await api(`/games/${form.value.id}`, 'PATCH', { name: form.value.name, description: form.value.description }) }
  else { await api('/games', 'POST', form.value) }
  clear(); await load()
}) }
function remove(game: GameRecord) { if (confirm(`删除游戏“${game.name}”？仍有 Skill 绑定时无法删除。`)) { void run(async () => { await api(`/games/${game.id}`, 'DELETE'); await load() }) } }
onMounted(() => run(load))
</script>
<template>
  <header class="page-heading"><div><p class="eyebrow">CATALOG / GAMES</p><h1>游戏管理</h1><p class="muted">先创建游戏，再绑定官方游戏 Skill。</p></div><span class="count mono">{{ games.length.toString().padStart(2, '0') }}</span></header>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
  <div class="split-layout"><section class="panel"><h2>游戏目录</h2><p v-if="!games.length" class="empty">尚未创建游戏。通用 Skill 仍可直接创建。</p>
    <article v-for="game in games" :key="game.id" class="list-row"><div><h3>{{ game.name }}</h3><code>{{ game.id }}</code><p class="muted">{{ game.description }}</p></div><div class="actions"><button :disabled="busy" @click="form = { ...game }; editing = true">编辑</button><button class="danger" :disabled="busy" @click="remove(game)">删除</button></div></article>
  </section><GameForm v-model="form" :editing="editing" :busy="busy" @save="save" @cancel="clear" /></div>
</template>
