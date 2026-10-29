# Cloudflare 部署

管理端部署为 Workers Static Assets，浏览器直接请求 API Worker；API 使用 D1 和私有 R2。CORS 使用 Elysia 官方 `@elysia/cors` 插件，生产只允许配置的管理端来源，并保留 `credentials: include` 与 HttpOnly Cookie。

两个域名必须是同一主域下的 HTTPS 子域名，例如 `admin.example.com` 和 `api.example.com`，Cookie 父域为 `.example.com`。请将域名所在 Zone 接入部署使用的 Cloudflare 账号。部署脚本配置 Custom Domains，生产不开启 `workers.dev` 地址。

## 一次性准备

需要 Node.js 24、pnpm（版本由根 `package.json` 指定）、PowerShell 7。所有命令从仓库根目录执行。

```powershell
pnpm install --frozen-lockfile
pnpm --filter server exec wrangler login
pnpm --filter server exec wrangler d1 create gen-mod-admin
pnpm --filter server exec wrangler r2 bucket create gen-mod-skill-packs
```

保存 D1 创建结果中的 `database_id`。已有同名资源时直接使用，不要重新创建。本地 Wrangler 的账号数据和 R2 文件不会自动迁移到线上。

本地部署可以使用 Wrangler 登录；GitHub 部署使用 API Token。可从 Cloudflare 的 Edit Cloudflare Workers 模板创建令牌，并补齐 D1 与 R2 的编辑权限，以及目标 Zone 的读取、Worker Routes 编辑权限，范围限定到部署账号和域名。

## 配置

本地 PowerShell 与 GitHub Actions 使用相同的环境变量。

| 名称 | 内容 | GitHub 存放位置 |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID | Variables |
| `D1_DATABASE_ID` | 生产 D1 数据库 UUID | Variables |
| `ADMIN_ORIGIN` | `https://admin.example.com` | Variables |
| `API_ORIGIN` | `https://api.example.com` | Variables |
| `COOKIE_DOMAIN` | `.example.com` | Variables |
| `CLOUDFLARE_API_TOKEN` | 部署用 API Token；本地已登录时可不设置 | Secrets |
| `JWT_SECRET` | 生产 JWT 随机密钥，后续发布保持同一个值 | Secrets |
| `ADMIN_EMAILS` | 管理员邮箱，多个用逗号分隔 | Secrets |

`ADMIN_ORIGIN`、`API_ORIGIN` 只填写来源，不带路径。脚本自动生成 API 的 `CORS_ORIGINS`、Cookie 父域、域名绑定，以及管理端构建时的 `VITE_API_URL`，不需要手动改写 Wrangler 配置或提交账号 ID。

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = '填写账号 ID'
$env:D1_DATABASE_ID = '填写生产数据库 UUID'
$env:ADMIN_ORIGIN = 'https://admin.example.com'
$env:API_ORIGIN = 'https://api.example.com'
$env:COOKIE_DOMAIN = '.example.com'

# 在受信任的本地终端设置 JWT_SECRET、ADMIN_EMAILS。
# 使用 API Token 部署时同时设置 CLOUDFLARE_API_TOKEN。
```

## 本地部署

先预检；预检会执行管理端类型检查、生产构建与两个 Worker 的打包，不连接远端数据库，不部署，不上传密钥：

```powershell
pnpm run deploy:check
```

首次部署到全新、尚无表结构的数据库：

```powershell
pnpm run deploy -InitializeDatabase
```

后续部署：

```powershell
pnpm run deploy
```

脚本遇到任何构建、打包或部署错误立即停止。`JWT_SECRET` 与 `ADMIN_EMAILS` 通过 Wrangler `--secrets-file` 和 API 代码一起上传；临时配置、密钥和预检产物写在已忽略的 `apps/server/.wrangler/` 下，结束时清理，不输出密钥内容。

`-InitializeDatabase` 只执行当前完整 schema，不适用于已有数据库。已有旧数据库若缺少 `users.role`，在确认数据库结构后，使用同一个生产 `database_id` 配置单独执行 `apps/server/migrations/0001_persist_user_role.sql`，不要重跑初始化。后续结构变更也应提供对应增量迁移，不在每次自动部署时盲目执行 schema。

API 与管理端分两次部署，先 API 后管理端。如果第二步失败，API 可能已经发布；修复后重跑脚本，不会自动回滚或重新建库。

## GitHub 自动部署

1. 在 GitHub 仓库的 **Settings → Environments** 创建 `production`。
2. 按上表在该 Environment 配置 Variables 和 Secrets。
3. 确保生产数据库已完成首次初始化。
4. 将代码合入仓库默认分支。相关应用、共享包、部署脚本或工作流的变更会触发部署。

工作流位于 `.github/workflows/deploy.yml`，不依赖默认分支具体叫 `main` 还是 `master`。非默认分支不会执行生产部署，也不使用 Pull Request 触发生产发布。可在 Actions 页面手动运行，仍要求选择默认分支。

GitHub 与本地调用同一个 `pnpm run deploy`。工作流只读检出代码，使用 `pnpm install --frozen-lockfile`；生产部署串行执行，不中途取消正在进行的部署。它不自动创建 D1/R2，也不发布桌面端安装包。

## 部署后接入

- 用 `ADMIN_EMAILS` 中的邮箱注册或登录管理端，然后创建游戏并发布 Skill。
- 桌面端登录页服务地址填写 `API_ORIGIN`，不带 `/api`；客户端代码目前的默认值仍是本地 `8787`。
- 生产首次联调需确认 Cookie 登录、来源白名单、发布 Skill、按 fileId 下载与客户端确认更新等真实流程。构建与 dry-run 只验证本地产物，不能替代线上验收。

官方参考：[Elysia CORS](https://elysiajs.com/plugins/cors)、[Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)、[Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)。
