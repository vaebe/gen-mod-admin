<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { CatalogSkill, GameRecord, SkillRecord } from '../../types'
import { api, message } from '../../lib/api'
import SkillForm from './SkillForm.vue'
import SkillEditor from './SkillEditor.vue'
const skills = ref<CatalogSkill[]>([]); const games = ref<GameRecord[]>([]); const selectedId = shallowRef(''); const error = shallowRef(''); const busy = shallowRef(false)
const selected = computed(() => skills.value.find(skill => skill.id === selectedId.value))
async function load() { try { [skills.value, games.value] = await Promise.all([api<CatalogSkill[]>('/skills'), api<GameRecord[]>('/games')]) } catch (cause) { error.value = message(cause) } }
async function create(skill: Omit<SkillRecord, 'id'>) { busy.value = true; error.value = ''; try { const created = await api<SkillRecord>('/skills', 'POST', skill); await load(); selectedId.value = created.id } catch (cause) { error.value = message(cause) } finally { busy.value = false } }
onMounted(load)
</script>
<template>
  <header class="page-heading"><div><p class="eyebrow">REGISTRY / SKILLS</p><h1>官方 Skill</h1><p class="muted">清单与版本由后台管理，zip 仅保存文件本体。</p></div><span class="count mono">{{ skills.length.toString().padStart(2, '0') }}</span></header>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
  <div class="skill-layout"><aside class="stack"><section class="panel stack"><div class="section-heading"><h2>Skill 目录</h2><button @click="selectedId = ''">新建</button></div><p v-if="!skills.length" class="muted">尚无官方 Skill</p><button v-for="skill in skills" :key="skill.id" class="skill-choice" :class="{ active: skill.id === selectedId }" @click="selectedId = skill.id"><strong>{{ skill.name }}</strong><small>{{ skill.kind === 'common' ? '通用' : skill.gameId }} · {{ skill.versions.length }} 个版本</small></button></section></aside>
    <SkillEditor v-if="selected" :key="selected.id" :skill="selected" @changed="load" /><section v-else class="panel stack"><h2>创建 Skill</h2><p class="muted">通用 Skill 无需游戏；游戏 Skill 必须绑定已有游戏。</p><fieldset :disabled="busy"><SkillForm :games="games" @save="create" /></fieldset></section>
  </div>
</template>
