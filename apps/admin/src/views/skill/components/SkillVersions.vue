<script setup lang="ts">
import { Download, FilePenLine, Trash2, History } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import type { SkillVersionRecord } from "@/types";
defineProps<{ versions: SkillVersionRecord[]; busy?: boolean }>();
const emit = defineEmits<{
  remove: [version: SkillVersionRecord];
  download: [version: SkillVersionRecord];
  edit: [version: SkillVersionRecord];
}>();
function formatDate(value: string): string {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
</script>
<template>
  <section>
    <div class="flex items-center justify-between border-b p-5">
      <div>
        <h2>版本记录</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          加载历史版本到编辑区后，使用新版本号发布修改。
        </p>
      </div>
      <span class="label-tag font-mono">{{ versions.length }} / 5</span>
    </div>
    <p
      v-if="versions.length >= 5"
      class="m-4 rounded-md bg-muted p-3 text-xs leading-6 text-muted-foreground"
    >
      已达 5 个版本，请先移除旧版本再发布。移除不会删除用户本机已有文件。
    </p>
    <div v-if="!versions.length" class="empty">
      <History :size="32" :stroke-width="1.2" />
      <h3 class="text-foreground">尚未发布版本</h3>
      <p>完成文件与清单编辑后，发布首个可供桌面端使用的版本。</p>
    </div>
    <div v-else class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>版本号</th>
            <th>上传时间</th>
            <th>内容哈希</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in versions" :key="item.id">
            <td>
              <div class="flex items-center gap-2">
                <span class="font-mono font-medium">{{ item.version }}</span
                ><span v-if="index === 0" class="label-tag label-tag-common">最近发布</span>
              </div>
            </td>
            <td class="whitespace-nowrap text-xs text-muted-foreground">
              {{ formatDate(item.uploadedAt) }}
            </td>
            <td class="font-mono text-xs text-muted-foreground" :title="item.contentHash">
              {{ item.contentHash.slice(0, 12) }}…
            </td>
            <td>
              <div class="flex gap-1">
                <Button variant="outline" size="sm" :disabled="busy" @click="emit('edit', item)"
                  ><FilePenLine :size="14" />加载编辑</Button
                ><Button
                  variant="ghost"
                  size="icon-sm"
                  title="下载 zip"
                  :aria-label="`下载版本 ${item.version}`"
                  :disabled="busy"
                  @click="emit('download', item)"
                  ><Download :size="15" /></Button
                ><Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-destructive"
                  title="移除版本"
                  :aria-label="`移除版本 ${item.version}`"
                  :disabled="busy"
                  @click="emit('remove', item)"
                  ><Trash2 :size="14"
                /></Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
