<script setup lang="ts">
import { defineAsyncComponent, useTemplateRef } from "vue";
import {
  ArrowLeft,
  Upload,
  FolderUp,
  Archive,
  SlidersHorizontal,
  History,
  Check,
  Plus,
  ChevronDown,
} from "@lucide/vue";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  versionsOpen,
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
    <header class="page-heading mb-4">
      <div class="min-w-0">
        <div class="flex items-center gap-3">
          <h1 class="truncate text-lg">{{ isNew ? "新增 Skill" : skill.name }}</h1>
          <Badge v-if="!isNew" variant="secondary">{{
            skill.kind === "common" ? "通用 Skill" : "游戏 Skill"
          }}</Badge>
          <span v-if="documentDirty" class="flex items-center gap-1.5 text-xs text-muted-foreground"
            ><span class="size-1.5 rounded-full bg-primary" />未发布修改</span
          >
        </div>
        <p
          v-if="notice"
          role="status"
          class="mt-1 flex items-center gap-1.5 text-xs leading-5 text-muted-foreground"
        >
          <Check :size="12" />{{ notice }}
        </p>
        <p v-else class="mt-1 text-xs leading-5 text-muted-foreground">
          {{
            isNew
              ? "填写基本信息，编写文件，然后发布首个版本。"
              : skill.kind === "game"
                ? "绑定游戏：" +
                  (games.find((game) => game.id === skill.gameId)?.name || skill.gameId)
                : "适用于所有游戏的通用能力"
          }}
        </p>
      </div>
      <div class="actions">
        <Button as-child variant="ghost" :disabled="busy"
          ><RouterLink to="/skills"
            ><ArrowLeft data-icon="inline-start" />返回列表</RouterLink
          ></Button
        >
        <Button variant="outline" :disabled="busy" @click="settingsOpen = true"
          ><SlidersHorizontal data-icon="inline-start" />清单设置</Button
        >
        <Button v-if="!isNew" variant="outline" @click="versionsOpen = true"
          ><History data-icon="inline-start" />版本管理<Badge variant="secondary">{{
            skill.versions.length
          }}</Badge></Button
        >
        <Button v-if="isNew" type="submit" form="skill-identity" :disabled="busy"
          ><Plus data-icon="inline-start" />{{ busy ? "正在创建…" : "创建 Skill" }}</Button
        >
        <Button
          v-else
          :disabled="busy || !files['SKILL.md']"
          @click="
            error = '';
            publishOpen = true;
          "
          ><Upload data-icon="inline-start" />发布新版本</Button
        >
      </div>
    </header>
    <Alert
      v-if="error && !publishOpen && !versionsOpen && !settingsOpen"
      variant="destructive"
      class="mb-3"
      ><AlertDescription>{{ error }}</AlertDescription></Alert
    >
    <SkillIdentityForm
      v-if="isNew"
      v-model="identity"
      v-model:description="metadata.description"
      :games="games"
      :busy="busy"
      @save="saveNew"
    />
    <div class="surface">
      <SkillFiles v-model="files" :busy="busy">
        <template #toolbar>
          <DropdownMenu>
            <DropdownMenuTrigger as-child
              ><Button variant="ghost" size="sm" :disabled="busy"
                ><FolderUp data-icon="inline-start" />导入文件<ChevronDown
                  data-icon="inline-end" /></Button
            ></DropdownMenuTrigger>
            <DropdownMenuContent align="start"
              ><DropdownMenuGroup>
                <DropdownMenuItem @select="zipInput?.click()"><Archive />导入 zip</DropdownMenuItem>
                <DropdownMenuItem @select="folderInput?.click()"
                  ><FolderUp />上传文件夹</DropdownMenuItem
                >
              </DropdownMenuGroup></DropdownMenuContent
            >
          </DropdownMenu>
        </template>
      </SkillFiles>
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
    />
    <input
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
    <Sheet v-model:open="versionsOpen">
      <SheetContent class="data-[side=right]:w-[780px]" :aria-busy="busy">
        <SheetHeader
          ><SheetTitle>版本管理</SheetTitle
          ><SheetDescription
            >管理已发布版本。加载历史内容后，使用新版本号发布修改。</SheetDescription
          ></SheetHeader
        >
        <Alert v-if="error" variant="destructive" class="mx-5 w-auto"
          ><AlertDescription>{{ error }}</AlertDescription></Alert
        >
        <div class="min-h-0 flex-1 overflow-auto">
          <SkillVersions
            :versions="skill.versions"
            :busy="busy"
            @edit="loadVersion"
            @download="download"
            @remove="removeVersion"
          />
        </div>
      </SheetContent>
    </Sheet>
    <Sheet v-model:open="settingsOpen">
      <SheetContent class="data-[side=right]:w-[420px]">
        <SheetHeader
          ><SheetTitle>清单设置</SheetTitle
          ><SheetDescription>{{
            isNew
              ? "创建 Skill 时保存以下清单字段。"
              : "说明与清单可独立保存，文件内容通过发布新版本保存。"
          }}</SheetDescription></SheetHeader
        >
        <Alert v-if="error" variant="destructive" class="mx-5 w-auto"
          ><AlertDescription>{{ error }}</AlertDescription></Alert
        >
        <fieldset :disabled="busy" class="min-h-0 flex-1 overflow-auto px-5 pb-5">
          <SkillMetadataForm v-model="metadata" :create-mode="isNew" @save="saveMetadata" />
        </fieldset>
      </SheetContent>
    </Sheet>
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
