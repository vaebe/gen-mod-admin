import { computed, onMounted, ref, shallowRef, watch } from "vue";
import type { CatalogSkill, CreateSkillPayload, GameRecord, SkillVersionRecord } from "@/types";
import { createSkill } from "@/api/skill";
import { createInitialFiles } from "@/utils/skill-files";
import { useConfirmation } from "@/composables/useConfirmation";
import { useSkillEditor } from "./useSkillEditor";

export interface SkillIdentity {
  name: string;
  kind: "common" | "game";
  gameId: string;
}
interface WorkspaceEvents {
  changed: () => void;
  created: (skill: CatalogSkill) => void;
  dirty: (value: boolean) => void;
  busy: (value: boolean) => void;
}

export function useSkillWorkspace(
  getSkill: () => CatalogSkill,
  getGames: () => GameRecord[],
  events: WorkspaceEvents,
) {
  const editor = useSkillEditor(getSkill, events.changed);
  const {
    metadata,
    files,
    version,
    busy,
    notice,
    dirty,
    filesDirty,
    importFiles,
    publish,
    edit,
    remove,
    run,
  } = editor;
  const identity = ref<SkillIdentity>({
    name: getSkill().name,
    kind: getSkill().kind,
    gameId: getSkill().gameId || "",
  });
  const isNew = computed(() => !getSkill().id);
  const versionsOpen = shallowRef(false);
  const settingsOpen = shallowRef(false);
  const publishOpen = shallowRef(false);
  const confirmation = useConfirmation();
  let templateBytes = files.value["SKILL.md"];
  const initialIdentity = JSON.stringify(identity.value);
  const documentDirty = computed(
    () =>
      dirty.value ||
      Boolean(version.value) ||
      (isNew.value && JSON.stringify(identity.value) !== initialIdentity),
  );
  watch(documentDirty, events.dirty, { immediate: true });
  watch(busy, events.busy, { immediate: true });
  watch(notice, (value, _previous, onCleanup) => {
    if (!value) {
      return;
    }
    const timer = setTimeout(() => {
      notice.value = "";
    }, 6000);
    onCleanup(() => clearTimeout(timer));
  });
  watch(
    () => [identity.value.name, metadata.value.description],
    () => {
      // 默认模板跟随基本信息，人工编辑过的入口不再自动覆盖。
      if (isNew.value && files.value["SKILL.md"] === templateBytes) {
        templateBytes = createInitialFiles(identity.value.name, metadata.value.description)[
          "SKILL.md"
        ];
        files.value = { ...files.value, "SKILL.md": templateBytes! };
      }
    },
  );

  async function saveNew(): Promise<void> {
    await run(async () => {
      if (!metadata.value.description.trim()) {
        throw new Error("请填写 Skill 说明");
      }
      if (
        identity.value.kind === "game" &&
        !getGames().some((game) => game.id === identity.value.gameId)
      ) {
        throw new Error("游戏 Skill 必须选择已有游戏");
      }
      const base = { name: identity.value.name, ...metadata.value };
      const payload: CreateSkillPayload =
        identity.value.kind === "game"
          ? { ...base, kind: "game", gameId: identity.value.gameId }
          : { ...base, kind: "common", gameId: null };
      const created = await createSkill(payload);
      events.created({ ...created, versions: [] });
      notice.value = "Skill 已创建，编辑内容仍保留在当前页面。请发布首个版本。";
    });
  }

  async function selectFiles(event: Event, folder: boolean): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    input.value = "";
    if (!selected.length) {
      return;
    }
    if (
      filesDirty.value &&
      !(await confirmation.ask({
        title: "替换当前文件？",
        description: "导入将替换当前编辑区内的全部文件，未发布的修改将丢失。",
        action: "替换文件",
      }))
    ) {
      return;
    }
    if (await importFiles(selected, folder)) {
      versionsOpen.value = false;
    }
  }

  async function loadVersion(item: SkillVersionRecord): Promise<void> {
    if (
      dirty.value &&
      !(await confirmation.ask({
        title: "加载其他版本？",
        description: "当前未保存的文件与清单修改将被所选版本替换。",
        action: "加载版本",
      }))
    ) {
      return;
    }
    if (await edit(item)) {
      versionsOpen.value = false;
    }
  }

  async function removeVersion(item: SkillVersionRecord): Promise<void> {
    if (
      await confirmation.ask({
        title: `移除版本 ${item.version}？`,
        description: "此版本及其服务端文件将移除。用户本机已下载的文件仍会保留。",
        action: "移除版本",
        destructive: true,
      })
    ) {
      await remove(item);
    }
  }

  async function publishVersion(value: string): Promise<void> {
    if (await publish(value)) {
      publishOpen.value = false;
    }
  }

  onMounted(() => {
    const latest = getSkill().versions[0];
    if (latest) {
      void edit(latest);
    }
  });
  return {
    ...editor,
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
  };
}
