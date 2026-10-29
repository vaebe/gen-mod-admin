<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Search, Boxes, ArrowUpRight, Gamepad2, Globe } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { CatalogSkill, GameRecord } from "@/types";
import { useSkillCatalog } from "../composables/useSkillCatalog";
const props = defineProps<{ skills: CatalogSkill[]; games: GameRecord[]; busy: boolean }>();
const { query, game, filtered } = useSkillCatalog(() => props.skills);
function gameName(skill: CatalogSkill): string {
  return skill.kind === "common"
    ? "所有游戏"
    : props.games.find((item) => item.id === skill.gameId)?.name || skill.gameId;
}
</script>
<template>
  <section class="surface" :aria-busy="busy">
    <div class="flex items-center gap-3 border-b p-4">
      <div class="relative min-w-44 max-w-sm flex-1">
        <Search
          :size="16"
          class="pointer-events-none absolute left-3 top-2.5 text-muted-foreground"
        /><Input
          v-model="query"
          class="pl-9"
          aria-label="搜索 Skill"
          placeholder="搜索名称或说明…"
        />
      </div>
      <Select :model-value="game" @update:model-value="game = String($event)">
        <SelectTrigger class="min-w-44" aria-label="按游戏筛选"
          ><SelectValue placeholder="全部游戏与通用"
        /></SelectTrigger>
        <SelectContent
          ><SelectGroup>
            <SelectItem value="all">全部游戏与通用</SelectItem>
            <SelectItem value="common">通用 Skill</SelectItem>
            <SelectItem v-for="item in games" :key="item.id" :value="'game:' + item.id">{{
              item.name
            }}</SelectItem>
          </SelectGroup></SelectContent
        >
      </Select>
      <span class="ml-auto text-xs text-muted-foreground">{{ filtered.length }} 个 Skill</span>
    </div>
    <div v-if="busy && !skills.length" role="status" class="flex flex-col gap-4 p-6">
      <Skeleton v-for="n in 4" :key="n" class="h-12 rounded bg-muted" />
      <span class="sr-only">正在加载 Skill…</span>
    </div>
    <div v-else-if="!filtered.length" class="empty">
      <Boxes :size="32" :stroke-width="1.2" />
      <h2 class="text-foreground">
        {{ skills.length ? "没有匹配的 Skill" : "开始维护官方 Skill" }}
      </h2>
      <p>
        {{
          skills.length
            ? "调整游戏筛选或搜索词后重试。"
            : "创建 Skill 后即可编辑文件，并发布供桌面端使用的版本。"
        }}
      </p>
      <Button v-if="!skills.length" as-child variant="outline"
        ><RouterLink to="/skills/new">新增 Skill</RouterLink></Button
      ><Button
        v-else
        variant="outline"
        @click="
          query = '';
          game = 'all';
        "
        >清除筛选</Button
      >
    </div>
    <div v-else class="table-shell">
      <Table class="data-table">
        <TableHeader>
          <TableRow>
            <TableHead>Skill 名称 / 说明</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>适用游戏</TableHead>
            <TableHead>版本</TableHead>
            <TableHead><span class="sr-only">操作</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="skill in filtered" :key="skill.id">
            <TableCell class="min-w-52">
              <RouterLink
                :to="`/skills/${encodeURIComponent(skill.id)}/edit`"
                class="font-mono text-[13px] font-semibold hover:text-primary"
                >{{ skill.name }}</RouterLink
              >
              <p
                class="mt-1.5 max-w-md truncate text-xs text-muted-foreground"
                :title="skill.description"
              >
                {{ skill.description }}
              </p>
            </TableCell>
            <TableCell>
              <span
                class="label-tag whitespace-nowrap"
                :class="{ 'label-tag-common': skill.kind === 'common' }"
                ><Globe v-if="skill.kind === 'common'" :size="12" /><Gamepad2 v-else :size="12" />{{
                  skill.kind === "common" ? "通用" : "游戏"
                }}</span
              >
            </TableCell>
            <TableCell class="whitespace-nowrap text-xs">{{ gameName(skill) }}</TableCell>
            <TableCell class="whitespace-nowrap">
              <span class="font-mono text-xs">{{ skill.versions.length }} / 5</span>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ skill.versions[0]?.version || "未发布" }}
              </p>
            </TableCell>
            <TableCell>
              <Button as-child variant="ghost" size="sm"
                ><RouterLink :to="`/skills/${encodeURIComponent(skill.id)}/edit`"
                  >编辑<ArrowUpRight :size="14" /></RouterLink
              ></Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <footer class="border-t px-5 py-3 text-xs text-muted-foreground">
      每个 Skill 最多保留 5 个版本，已发布的内容使用新版本号更新。
    </footer>
  </section>
</template>
