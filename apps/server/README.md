# GenMod API

代码按 [Elysia 官方最佳实践](https://elysiajs.com/essential/best-practice) 组织：

```text
src/modules/
  auth/    index.ts、model.ts、service.ts、guard.ts、token.ts
  games/   index.ts、model.ts、service.ts
  skills/  index.ts、model.ts、service.ts
  files/   index.ts（复用 Skill 的文件下载服务）
```

`index.ts` 是 Elysia controller，负责 URL、schema、Cookie 和响应；`model.ts` 定义校验并以 `.static` 推导类型；`service.ts` 接收已校验的数据和存储绑定，处理业务与持久化，不接收 Elysia Context。鉴权由 `auth/guard.ts` 的 `authorize` macro 复用。`app.ts` 仅组装模块与命名错误处理，Worker 绑定通过 `Cloudflare.Env` 声明。

上传由 `t.File` 和 multipart 清单 schema 校验，清单字段的 JSON 解码也在模型中完成。Skill 内容校验与 canonical hash 保留在独立的 `skill-package.ts`，不依赖 HTTP 请求。

项目使用 `bun create elysia apps/server --no-git` 生成，再接入 Workers、D1 和 R2。

在仓库根执行 `pnpm install` 安装依赖。完整 API 使用 Workers 本地运行时：

```powershell
Set-Location apps/server
Copy-Item .dev.vars.example .dev.vars
# 编辑 .dev.vars，填写本地管理员邮箱和随机 JWT_SECRET。
pnpm exec wrangler d1 execute gen-mod-admin --local --file src/schema.sql
pnpm run dev:worker
```

首次初始化才运行 `schema.sql`。本地 API 默认地址为 `http://127.0.0.1:8787`，D1 和 R2 使用 Wrangler 本地存储。另开终端在 `apps/admin` 执行 `pnpm exec vp dev`。管理端通过 `VITE_API_URL` 直接请求 API，未配置时开发地址为 `http://127.0.0.1:8787`，不再使用 `/api` 代理。

跨域由 Elysia 官方 `@elysia/cors` 插件处理。`CORS_ORIGINS` 为逗号分隔的完整来源白名单，允许携带 Cookie；未配置时只允许本地 5173 的 `localhost` 和 `127.0.0.1`。桌面端 Bearer Token 鉴权保持不变。

`bun dev` 保留官方模板的 Bun 开发服务器，只提供模板首页；账号、游戏和 Skill API 需用上述 `dev:worker`。测试执行 `bun test src`，构建检查执行 `pnpm run build:worker`，均不部署到云端。

若数据库已按加入 `users.role` 之前的旧 schema 初始化，只执行一次增量迁移，不要重建数据库：

```powershell
pnpm exec wrangler d1 execute gen-mod-admin --local --file migrations/0001_persist_user_role.sql
```

迁移后角色默认普通用户；下次登录按 `ADMIN_EMAILS` 更新。新建数据库已含该列，不应重复执行此迁移。生产已有数据库使用同一脚本配合 `--remote`，执行前确认目标数据库；本次未执行远端迁移或部署。

生产环境使用根目录的 PowerShell 部署脚本与 GitHub Actions，配置方式见 [部署说明](../../docs/deployment.md)。后台为纯静态资源 Worker，浏览器直接请求 API 域名。生产 Cookie 仍使用同一主域下的父域 `COOKIE_DOMAIN`。不要将 `.dev.vars` 或真实密钥提交。
