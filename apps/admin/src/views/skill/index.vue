<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { Plus, RefreshCw } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { useSkills } from "./composables/useSkills";
const SkillCatalog = defineAsyncComponent(() => import("./components/SkillCatalog.vue"));
const { skills, games, error, busy, reload } = useSkills();
</script>
<template>
  <div>
    <header class="page-heading">
      <div>
        <h1>Skill 管理</h1>
        <p class="page-description">维护官方 Skill 内容，管理游戏绑定与发布版本。</p>
      </div>
      <div class="actions">
        <Button
          variant="outline"
          size="icon"
          aria-label="刷新列表"
          title="刷新列表"
          :disabled="busy"
          @click="reload"
          ><RefreshCw :size="16" :class="{ 'animate-spin': busy }" /></Button
        ><Button as-child
          ><RouterLink to="/skills/new"><Plus :size="16" />新增 Skill</RouterLink></Button
        >
      </div>
    </header>
    <div v-if="error" role="alert" class="error">
      <span>{{ error }}</span
      ><Button variant="outline" size="sm" :disabled="busy" @click="reload">重新加载</Button>
    </div>
    <SkillCatalog :skills="skills" :games="games" :busy="busy" />
  </div>
</template>
