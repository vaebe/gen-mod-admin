<script setup lang="ts">
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Download, FilePenLine, Trash2, History } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div class="flex items-center justify-between px-5 pb-4">
      <span class="text-xs text-muted-foreground">已发布版本</span
      ><Badge variant="secondary">{{ versions.length }} / 5</Badge>
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
      <Table class="data-table">
        <TableHeader>
          <TableRow>
            <TableHead>版本号</TableHead>
            <TableHead>上传时间</TableHead>
            <TableHead>内容哈希</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(item, index) in versions" :key="item.id">
            <TableCell>
              <div class="flex items-center gap-2">
                <span class="font-mono font-medium">{{ item.version }}</span
                ><span v-if="index === 0" class="label-tag label-tag-common">最近发布</span>
              </div>
            </TableCell>
            <TableCell class="whitespace-nowrap text-xs text-muted-foreground">
              {{ formatDate(item.uploadedAt) }}
            </TableCell>
            <TableCell class="font-mono text-xs text-muted-foreground" :title="item.contentHash">
              {{ item.contentHash.slice(0, 12) }}…
            </TableCell>
            <TableCell>
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
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
