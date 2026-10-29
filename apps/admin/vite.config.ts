import { fileURLToPath, URL } from "node:url";

import { defineConfig, lazyPlugins, loadEnv } from "vite-plus";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const apiUrl = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "VITE_").VITE_API_URL;
  if (command === "build" && !apiUrl?.startsWith("https://")) {
    throw new Error("生产构建必须通过 VITE_API_URL 指定 HTTPS API 地址");
  }
  return {
    fmt: {},
    lint: {
      jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      rules: { "vite-plus/prefer-vite-plus-imports": "error" },
      options: { typeAware: true, typeCheck: true },
    },
    plugins: lazyPlugins(() => [vue(), tailwindcss(), vueDevTools()]),
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
