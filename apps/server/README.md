# GenMod API

项目使用 `bun create elysia apps/server --no-git` 生成，再接入 Workers、D1 和 R2。

在仓库根执行 `pnpm install` 安装依赖。完整 API 使用 Workers 本地运行时：

```powershell
Set-Location apps/server
Copy-Item .dev.vars.example .dev.vars
# 编辑 .dev.vars，填写本地管理员邮箱和随机 JWT_SECRET。
pnpm exec wrangler d1 execute gen-mod-admin --local --file src/schema.sql
pnpm run dev:worker
```

首次初始化才运行 `schema.sql`。本地 API 默认地址为 `http://127.0.0.1:8787`，D1 和 R2 使用 Wrangler 本地存储。另开终端在 `apps/admin` 执行 `pnpm exec vp dev`，前端的 `/api` 代理指向此地址。

`bun dev` 保留官方模板的 Bun 开发服务器，只提供模板首页；账号、游戏和 Skill API 需用上述 `dev:worker`。测试执行 `bun test src`，构建检查执行 `pnpm run build:worker`，均不部署到云端。

若数据库已按加入 `users.role` 之前的旧 schema 初始化，只执行一次增量迁移，不要重建数据库：

```powershell
pnpm exec wrangler d1 execute gen-mod-admin --local --file migrations/0001_persist_user_role.sql
```

迁移后角色默认普通用户；下次登录按 `ADMIN_EMAILS` 更新。新建数据库已含该列，不应重复执行此迁移。生产已有数据库使用同一脚本配合 `--remote`，执行前确认目标数据库；本次未执行远端迁移或部署。

生产环境需配置真实 D1/R2 资源、`ADMIN_EMAILS`、`JWT_SECRET` 和父域 `COOKIE_DOMAIN`，后台 Worker 通过 Service Binding 调用 API。不要将 `.dev.vars` 或真实密钥提交。
