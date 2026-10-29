import { createApp } from "./app";
import { loadEnv } from "./env";

export const app = createApp(loadEnv()).listen({
  port: Number(process.env.PORT ?? 8787),
  hostname: process.env.HOST ?? "127.0.0.1",
});
console.log(`GenMod API: ${app.server?.url}`);
