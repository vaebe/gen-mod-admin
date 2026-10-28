<script setup lang="ts">
import { defineAsyncComponent, useTemplateRef } from "vue";
import {
  ArrowLeft,
  Upload,
  FolderUp,
  Archive,
  SlidersHorizontal,
  FileCode2,
  History,
  Check,
  Plus,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CatalogSkill, GameRecord } from "@/types";
import { useSkillWorkspace } from "../composables/useSkillWorkspace";
const props = withDefaults(defineProps<{ skill: CatalogSkill; games?: GameRecord[] }>(), {
  games: () => [],
});
const emit = defineEmits<{
  changed: [];
  created: [skill: CatalogSkill];
  dirty: [value: boolean];
  busy: [value: boolean];
}>();
const SkillIdentityForm = defineAsyncComponent(() => import("./SkillIdentityForm.vue"));
const SkillMetadataForm = defineAsyncComponent(() => import("./SkillMetadataForm.vue"));
const SkillFiles = defineAsyncComponent(() => import("./SkillFiles.vue"));
const SkillVersions = defineAsyncComponent(() => import("./SkillVersions.vue"));
const PublishVersionDialog = defineAsyncComponent(() => import("./PublishVersionDialog.vue"));
const ConfirmDialog = defineAsyncComponent(() => import("@/components/ConfirmDialog.vue"));
const zipInput = useTemplateRef<HTMLInputElement>("zipInput");
const folderInput = useTemplateRef<HTMLInputElement>("folderInput");
const {
  metadata,
  files,
  version,
  busy,
  error,
  notice,
  saveMetadata,
  download,
  identity,
  isNew,
  currentTab,
  settingsOpen,
  publishOpen,
  confirmation,
  documentDirty,
  saveNew,
  selectFiles,
  loadVersion,
  removeVersion,
  publishVersion,
} = useSkillWorkspace(
  () => props.skill,
  () => props.games,
  {
    changed: () => emit("changed"),
    created: (skill) => emit("created", skill),
    dirty: (value) => emit("dirty", value),
    busy: (value) => emit("busy", value),
  },
);
</script>
<template>
  <section :aria-busy="busy">
    <header class="page-heading">
      <div>
        <div class="flex items-center gap-3">
          <h1 :class="{ 'font-mono text-xl': !isNew }">{{ isNew ? "新增 Skill" : skill.name }}</h1>
          <span
            v-if="!isNew"
            class="label-tag"
            :class="{ 'label-tag-common': skill.kind === 'common' }"
            >{{ skill.kind === "common" ? "通用 Skill" : "游戏 Skill" }}</span
          >
        </div>
        <p class="page-description">
          {{
            isNew
              ? "填写基本信息，编写文件，然后发布首个版本。"
              : skill.kind === "game"
                ? `绑定游戏：${games.find((game) => game.id === skill.gameId)?.name || skill.gameId}`
                : "适用于所有游戏的通用能力"
          }}
        </p>
      </div>
      <div class="actions">
        <Button as-child variant="outline" :disabled="busy"
          ><RouterLink to="/skills"><ArrowLeft :size="14" />返回列表</RouterLink></Button
        ><Button v-if="isNew" type="submit" form="skill-identity" :disabled="busy"
          ><Plus :size="15" />{{ busy ? "正在创建…" : "创建 Skill" }}</Button
        ><Button
          v-else
          :disabled="busy || !files['SKILL.md']"
          @click="
            error = '';
            publishOpen = true;
          "
          ><Upload :size="15" />发布新版本</Button
        >
      </div>
    </header>
    <p v-if="error && !publishOpen" role="alert" class="error">{{ error }}</p>
    <p v-if="notice" role="status" class="notice">
      <Check :size="15" class="shrink-0" />{{ notice }}
    </p>
    <SkillIdentityForm
      v-if="isNew"
      v-model="identity"
      v-model:description="metadata.description"
      :games="games"
      :busy="busy"
      @save="saveNew"
    />
    <div class="workspace-shell" :class="{ 'settings-closed': !settingsOpen }">
      <Tabs v-model="currentTab" class="surface min-w-0 gap-0">
        <div class="flex items-center gap-2 border-b px-3 py-2">
          <TabsList variant="line"
            ><TabsTrigger value="files"><FileCode2 :size="14" />内容文件</TabsTrigger
            ><TabsTrigger value="versions"
              ><History :size="14" />版本记录
              <span class="ml-1 font-mono text-[10px]">{{
                skill.versions.length
              }}</span></TabsTrigger
            ></TabsList
          ><span
            v-if="documentDirty"
            class="ml-2 flex items-center gap-1.5 text-[11px] text-amber-800"
            ><span class="size-1.5 rounded-full bg-amber-600" />未发布修改</span
          >
          <div class="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="清单设置"
              aria-label="切换清单设置"
              :aria-pressed="settingsOpen"
              @click="settingsOpen = !settingsOpen"
              ><SlidersHorizontal :size="15"
            /></Button>
          </div>
        </div>
        <TabsContent value="files" class="m-0" force-mount :hidden="currentTab !== 'files'">
          <div class="flex items-center gap-2 border-b px-3 py-2">
            <Button variant="outline" size="sm" :disabled="busy" @click="zipInput?.click()"
              ><Archive :size="14" />导入 zip</Button
            ><Button variant="outline" size="sm" :disabled="busy" @click="folderInput?.click()"
              ><FolderUp :size="14" />上传文件夹</Button
            ><span class="ml-auto text-[11px] text-muted-foreground">根目录必须包含 SKILL.md</span>
          </div>
          <input
            ref="zipInput"
            class="sr-only"
            tabindex="-1"
            aria-label="选择 zip 文件"
            type="file"
            accept=".zip"
            :disabled="busy"
            @change="selectFiles($event, false)"
          /><input
            ref="folderInput"
            class="sr-only"
            tabindex="-1"
            aria-label="选择 Skill 文件夹"
            type="file"
            webkitdirectory
            multiple
            :disabled="busy"
            @change="selectFiles($event, true)"
          />
          <SkillFiles v-model="files" :busy="busy" />
        </TabsContent>
        <TabsContent value="versions" class="m-0"
          ><SkillVersions
            :versions="skill.versions"
            :busy="busy"
            @edit="loadVersion"
            @download="download"
            @remove="removeVersion"
        /></TabsContent>
      </Tabs>
      <aside v-if="settingsOpen" class="surface self-start">
        <div class="flex items-center justify-between border-b px-5 py-4">
          <h2 class="text-sm">清单设置</h2>
          <span class="text-[10px] text-muted-foreground">{{
            isNew ? "随创建保存" : "独立于文件"
          }}</span>
        </div>
        <fieldset :disabled="busy" class="p-5">
          <SkillMetadataForm v-model="metadata" :create-mode="isNew" @save="saveMetadata" />
        </fieldset>
      </aside>
    </div>
    <PublishVersionDialog
      v-model:open="publishOpen"
      v-model:version="version"
      :versions="skill.versions"
      :busy="busy"
      :error="error"
      @publish="publishVersion"
    />
    <ConfirmDialog :request="confirmation.request.value" @answer="confirmation.answer" />
  </section>
</template>
<style scoped>
.workspace-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
}
.workspace-shell.settings-closed {
  grid-template-columns: minmax(0, 1fr);
}
</style>
