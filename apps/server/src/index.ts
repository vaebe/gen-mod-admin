import { env } from "cloudflare:workers";
import { createApp } from "./app";

export const app = createApp(env);
export default app;
