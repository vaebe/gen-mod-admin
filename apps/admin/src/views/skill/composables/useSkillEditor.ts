import { ref, shallowRef } from "vue";
import { unzipSync, zipSync } from "fflate";
import type { CatalogSkill, SkillMetadataPayload, SkillVersionRecord } from "@/types";
import {
  deleteSkillVersion,
  downloadSkillFile,
  publishSkillVersion,
  updateSkill,
} from "@/api/skill";
import { useRequestState } from "@/composables/useRequestState";
import { folderZip, readBytes } from "@/utils/skill-package";

export function useSkillEditor(getSkill: () => CatalogSkill, changed: () => void) {
  const skill = getSkill();
  const metadata = ref<SkillMetadataPayload>({
    description: skill.description,
    dependencies: [...skill.dependencies],
    excludePaths: [...skill.excludePaths],
    requiredCommandScripts: [...skill.requiredCommandScripts],
    inspectionFile: skill.inspectionFile,
  });
  const files = shallowRef<Record<string, Uint8Array>>({});
  const state = useRequestState();

  function saveMetadata(): Promise<boolean> {
    return state.run(async () => {
      await updateSkill(getSkill().id, metadata.value);
      state.notice.value = "说明与清单已保存";
      changed();
    });
  }

  function importFiles(selected: File[], folder: boolean): Promise<boolean> {
    return state.run(async () => {
      const first = selected[0];
      if (!first) {
        return;
      }
      const archive = folder ? await folderZip(selected) : await readBytes(first);
      const unpacked = unpackFiles(archive);
      if (!unpacked["SKILL.md"]) {
        throw new Error("包根目录必须包含 SKILL.md");
      }
      files.value = unpacked;
      state.notice.value = "文件已载入编辑区，尚未发布";
    });
  }

  function publish(version: string): Promise<boolean> {
    return state.run(async () => {
      if (!files.value["SKILL.md"]) {
        throw new Error("包根目录必须包含 SKILL.md");
      }
      const form = new FormData();
      form.set("zip", new Blob([new Uint8Array(zipSync(files.value)).buffer]), "skill.zip");
      form.set("version", version);
      form.set("description", metadata.value.description);
      for (const key of [
        "dependencies",
        "excludePaths",
        "requiredCommandScripts",
        "inspectionFile",
      ] as const) {
        form.set(key, JSON.stringify(metadata.value[key]));
      }
      await publishSkillVersion(getSkill().id, form);
      state.notice.value = "新版本已发布";
      changed();
    });
  }

  function edit(version: SkillVersionRecord): Promise<boolean> {
    return state.run(async () => {
      files.value = unpackFiles(await readBytes(await downloadSkillFile(version.fileId)));
      metadata.value = {
        description: getSkill().description,
        dependencies: [...version.manifest.dependencies],
        excludePaths: [...version.manifest.excludePaths],
        requiredCommandScripts: [...version.manifest.requiredCommandScripts],
        inspectionFile: version.manifest.inspectionFile,
      };
      state.notice.value = `已载入 ${version.version}，修改后请使用新版本号发布`;
    });
  }

  function download(version: SkillVersionRecord): Promise<boolean> {
    return state.run(async () => {
      const url = URL.createObjectURL(await downloadSkillFile(version.fileId));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${getSkill().name}-${version.version}.zip`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    });
  }

  function remove(version: SkillVersionRecord): void {
    if (!window.confirm(`移除版本 ${version.version}？本机已经下载的文件将保留。`)) {
      return;
    }
    void state.run(async () => {
      await deleteSkillVersion(getSkill().id, version.id);
      state.notice.value = "版本已移除";
      changed();
    });
  }

  return { ...state, metadata, files, saveMetadata, importFiles, publish, edit, download, remove };
}

function unpackFiles(bytes: Uint8Array): Record<string, Uint8Array> {
  return Object.fromEntries(
    Object.entries(unzipSync(bytes)).filter(([path]) => !path.endsWith("/")),
  );
}
