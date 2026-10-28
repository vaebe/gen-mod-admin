# GenMod 管理端第一期实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭好 `gen-mod-admin`（Elysia + Vue）提供账号、游戏、官方 Skill 数据，并改 `gen-mod` 桌面端按这些数据登录、确认更新、按游戏加载 Skill。

**架构：** 管理端只提供数据。D1 存账号、游戏、Skill、清单字段、版本快照和文件 id；R2 存 zip。桌面端按接口关联计算可加载集合，zip 只是文件本体。

**技术栈：** pnpm workspace；`apps/server` 为 `bun create elysia` + Cloudflare Workers / D1 / R2；`apps/admin` 为 Vite+ `vue` 模板；桌面端仍在 `D:\codetest\gen-mod`。

**规格：** `docs/superpowers/specs/2026-10-23-gen-mod-admin-design.md`

## 全局约束

- 实现以规格为准，不另造 Skill 文件格式，不把 registry 放进 zip。
- 后端按 https://elysiajs.com/quick-start.html 初始化：`bun create elysia apps/server --no-git`。
- 前端按 https://viteplus.dev/guide/create 初始化：`pnpm create vite-plus vue --package-manager pnpm --no-git`，再收成 `apps/admin`。禁止对 `vue` 模板使用 `--directory`。
- 包管理：仓库根 pnpm；`apps/server` 可用 bun 跑官方 `bun dev`。
- 标识/Skill 名称：小写字母、数字、连字符，1–64，不以 `-` 开头或结尾，不含 `--`。
- 一个 Skill 最多 5 个版本；版本号不重复；内容变了版本号没变则拒绝。
- 先写 R2 再写 D1；D1 失败则版本列表不变。
- 内容哈希算法与 `gen-mod` `validate` 相同（清单 canonical JSON + 排序后的文件路径与文件哈希）。
- 桌面端不删除本机已有 Skill 文件。
- 这期不做安装包发布、邮箱验证、找回密码、邀请码、第三方登录。
- 不把 Tauri 工程并进本 monorepo。
- 每个任务结束后在对应仓库 commit；本仓库只提交本仓库文件，`gen-mod` 的改动在 `D:\codetest\gen-mod` 单独 commit。

## 文件结构

将创建或修改：

**`gen-mod-admin`**

- `pnpm-workspace.yaml`、根 `package.json`：workspace
- `packages/contracts/`：共享类型（Game、Skill、SkillVersion、Auth）
- `apps/server/`：Elysia 官方脚手架 + `wrangler.jsonc`、D1 schema、auth/games/skills 路由、zip 校验
- `apps/admin/`：Vite+ vue 应用，登录、游戏管理、Skill 管理

**`D:\codetest\gen-mod`**

- `src-tauri/src/skills/registry.rs`：官方目录、按 `gameId` 加载、停用 `game_skill_name` resolve
- `src-tauri/src/cloud/`：登录、目录检查、按文件 id 下载
- `src-tauri/src/storage/mods.rs`、`NewModDialog.vue`：按游戏标识创建
- 所有 `resolve(app, &project.game_skill_name)` 调用点改为按 `game_id` 加载
- `src-tauri/tauri.conf.json`：去掉 `"../skills/": "skills/"`
- 前端登录页、更新提示

---

### 任务 1：初始化 monorepo 脚手架

- [x] **任务 1 已完成**

**文件：**

- 创建：`pnpm-workspace.yaml`、根 `package.json`
- 创建：`apps/server/`（`bun create elysia`）
- 创建：`apps/admin/`（Vite+ `vue` 模板搬入）
- 修改：根 `.gitignore`（若脚手架生成了多余 `.git` 则删除）

- [x] **步骤 1：确认工具**

```powershell
bun --version
pnpm --version
node --version
```

预期：三者都能运行。Node 需满足 Vue/Vite+ 要求（^22.18 或 >=24.12）。缺哪个就先装哪个，不要改用别的脚手架。

- [x] **步骤 2：创建后端**

在 `D:\codetest\gen-mod-admin`：

```powershell
bun create elysia apps/server --no-git
cd apps/server
bun dev
```

预期：`http://localhost:3000` 返回 Hello Elysia。停掉进程。

- [x] **步骤 3：创建前端**

仍在仓库根。不要加 `--directory`。

```powershell
pnpm create vite-plus vue --package-manager pnpm --no-git
```

若生成目录不叫 `apps/admin`，把整个生成目录移到 `apps/admin`。然后：

```powershell
cd apps/admin
pnpm exec vp dev
```

预期：Vite 开发服务器起来。停掉进程。若模板没有 Vue Router，下一步再装，本任务不装业务依赖。

- [x] **步骤 4：收口 workspace**

根 `pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

根 `package.json` 设 `"private": true`。确认 `apps/server` 和 `apps/admin` 各自没有嵌套 `.git`。

- [x] **步骤 5：Commit**

```powershell
git add pnpm-workspace.yaml package.json apps .gitignore
git commit -m "chore: 用官方脚手架初始化前后端"
```

---

### 任务 2：共享契约

- [x] **任务 2 已完成**

**文件：**

- 创建：`packages/contracts/package.json`
- 创建：`packages/contracts/src/index.ts`
- 测试：`packages/contracts/src/index.test.ts`（若该包用 bun test 或 vp test，与仓库已有测试运行器对齐）

- [x] **步骤 1：编写失败的类型导出测试**

`packages/contracts/src/index.ts` 先空着。测试文件断言这些类型可导入（用满足类型的对象字面量赋值）：

```ts
import type { GameRecord, SkillRecord, SkillVersionRecord, ManifestSnapshot } from './index'

const game: GameRecord = {
  id: 'duckov',
  name: '逃离鸭科夫',
  description: 'desc',
}

const skill: SkillRecord = {
  id: 'skill-uuid',
  name: 'duckov-mod',
  description: 'desc',
  kind: 'game',
  gameId: 'duckov',
  dependencies: ['mod-workflow'],
  excludePaths: ['bin', 'obj'],
  requiredCommandScripts: ['scripts/build.ps1'],
  inspectionFile: 'references/inspection.json',
}

const version: SkillVersionRecord = {
  id: 'ver-uuid',
  skillId: skill.id,
  version: '2.1.0',
  contentHash: 'a'.repeat(64),
  fileId: 'file-uuid',
  uploadedAt: '2026-10-23T00:00:00Z',
  manifest: {
    category: 'game',
    gameId: 'duckov',
    version: '2.1.0',
    dependencies: ['mod-workflow'],
    excludePaths: ['bin', 'obj'],
    requiredCommandScripts: ['scripts/build.ps1'],
    inspectionFile: 'references/inspection.json',
  },
}

void game
void skill
void version
const _m: ManifestSnapshot = version.manifest
void _m
```

- [x] **步骤 2：补上 `packages/contracts/src/index.ts` 使测试通过**

字段名与规格一致：`kind: 'common' | 'game'`；通用 Skill 的 `gameId` 为 `null`。

- [x] **步骤 3：Commit**

```powershell
git add packages/contracts
git commit -m "feat: 增加游戏与 Skill 共享契约"
```

---

### 任务 3：D1 / R2 与 Cloudflare 接入

- [x] **任务 3 已完成**

**文件：**

- 创建：`apps/server/wrangler.jsonc`
- 创建：`apps/server/src/schema.sql`
- 修改：`apps/server/src/index.ts`（Cloudflare adapter + `compile()`，绑定 D1/R2）
- 测试：`apps/server/src/schema.test.ts` 或对 schema 的解析测试

- [x] **步骤 1：写 schema.sql**

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('common', 'game')),
  game_id TEXT REFERENCES games(id),
  dependencies TEXT NOT NULL DEFAULT '[]',
  exclude_paths TEXT NOT NULL DEFAULT '[]',
  required_command_scripts TEXT NOT NULL DEFAULT '[]',
  inspection_file TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  file_id TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  manifest TEXT NOT NULL,
  UNIQUE (skill_id, version)
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL
);

CREATE TABLE cookie_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
```

角色不单独建表：登录时用 `ADMIN_EMAILS` 判定。`skills.game_id` 在 `kind='common'` 时必须为 NULL，在 `kind='game'` 时必须非空——用应用层校验，不要靠无法表达的 CHECK 跨列。

- [x] **步骤 2：wrangler.jsonc**

绑定 `DB`（D1）和 `SKILL_PACKS`（R2）。`compatibility_date` 至少 `2025-06-01`。本地开发可用 `wrangler dev`；保留官方 `bun dev` 仅用于无绑定的 hello 对照，业务接口以 wrangler/miniflare 为准。

- [x] **步骤 3：把 Elysia 接到 Workers**

按 https://elysiajs.com/integrations/cloudflare-worker.html：`CloudflareAdapter` + `.compile()`，`export default app`。从 env 读取 `DB`、`SKILL_PACKS`、`ADMIN_EMAILS`、`JWT_SECRET`。

- [x] **步骤 4：Commit**

```powershell
git add apps/server
git commit -m "feat: 接入 D1 R2 与 Cloudflare Worker"
```

---

### 任务 4：账号注册与登录

- [x] **任务 4 已完成**

**文件：**

- 创建：`apps/server/src/auth.ts`
- 创建：`apps/server/src/password.ts`
- 测试：`apps/server/src/auth.test.ts`
- 修改：`apps/server/src/index.ts`

- [x] **步骤 1：写失败测试**

覆盖：

1. `POST /auth/register` 邮箱+密码成功，不返回密码哈希。
2. 重复邮箱 → 错误。
3. `POST /auth/login` 密码错误 → 错误。
4. 登录成功：JSON 含 `accessToken`、`refreshToken`、`email`、`role`；响应 `Set-Cookie`（HttpOnly）。
5. `ADMIN_EMAILS` 含该邮箱则 `role` 为 `admin`，否则 `user`。
6. `GET /auth/me`：Cookie 或 `Authorization: Bearer` 均可；无凭证 → 401。
7. `POST /auth/refresh`：合法 refresh 换新 access；伪造 refresh → 401（不是 5xx）。
8. 网络层不测。凭证无效才 401。

示例骨架：

```ts
import { describe, expect, it } from 'bun:test'
import { app } from './index'

async function json(path: string, init?: RequestInit) {
  const response = await app.handle(new Request(`http://localhost${path}`, init))
  return { status: response.status, body: await response.json().catch(() => null), response }
}

describe('auth', () => {
  it('registers and logs in', async () => {
    const registered = await json('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.c', password: 'password12' }),
    })
    expect(registered.status).toBe(200)
    expect(registered.body.passwordHash).toBeUndefined()
  })
})
```

测试用注入的内存 D1/R2 mock 或 wrangler 本地 DB，不要连真实 Cloudflare。

- [x] **步骤 2：跑测试确认失败**

```powershell
cd apps/server
bun test src/auth.test.ts
```

预期：FAIL（路由不存在）。

- [x] **步骤 3：实现最少代码**

- 密码：Workers 可用的 PBKDF2（Web Crypto），只存哈希。
- 访问令牌：短时 JWT；刷新令牌：随机值，只存哈希。
- Cookie 名例如 `gm_session`，`HttpOnly; Secure; SameSite=Lax; Path=/`。本地 http 开发可不设 Secure。
- `ADMIN_EMAILS` 逗号分隔，大小写不敏感。

- [x] **步骤 4：跑测试确认通过**

```powershell
cd apps/server
bun test src/auth.test.ts
```

预期：PASS。

- [x] **步骤 5：Commit**

```powershell
git add apps/server
git commit -m "feat: 实现注册登录与双凭证"
```

---

### 任务 5：游戏管理 API

- [x] **任务 5 已完成**

**文件：**

- 创建：`apps/server/src/games.ts`
- 测试：`apps/server/src/games.test.ts`
- 修改：`apps/server/src/index.ts`

- [x] **步骤 1：写失败测试**

1. 普通用户 `POST /games` → 403。
2. 管理员创建 `{ id, name, description }` 成功。
3. `id` 不符合 `valid_name` → 拒绝。
4. 重复 id → 拒绝。
5. 改 name/description 成功；改 id 被拒绝或接口根本不接收 id。
6. 无 Skill 绑定时可删除；有 Skill 绑定不可删除。
7. `GET /games` 登录用户可列出（桌面端同步用）。

- [x] **步骤 2：跑测试确认失败**

```powershell
cd apps/server
bun test src/games.test.ts
```

- [x] **步骤 3：实现路由**

`POST /games`、`PATCH /games/:id`、`DELETE /games/:id` 需 admin。`GET /games` 需登录。

- [x] **步骤 4：跑测试确认通过并 commit**

```powershell
git add apps/server
git commit -m "feat: 实现游戏管理接口"
```

---

### 任务 6：zip 校验与内容哈希

- [x] **任务 6 已完成**

**文件：**

- 创建：`apps/server/src/skill-package.ts`
- 测试：`apps/server/src/skill-package.test.ts`
- 测试夹具：从 `D:\codetest\gen-mod\skills` 打一个合法 zip（只含 `common/mod-workflow` 目录内容，根上就是 `SKILL.md`），以及缺 `SKILL.md` 的非法 zip。

- [x] **步骤 1：写失败测试**

对照 `D:\codetest\gen-mod\src-tauri\src\skills\registry.rs` 的 `validate`：

1. 合法目录 + 清单快照 → 返回 64 位 hex 哈希。
2. `SKILL.md` name 与记录不一致 → 错。
3. 缺少 `SKILL.md` → 错。
4. `requiredCommandScripts` 指向不存在文件 → 错。
5. 同一清单+同一文件字节 → 哈希稳定。
6. 只改清单 `version`、文件不变 → 哈希变。
7. zip 根多包一层文件夹导致根上没有 `SKILL.md` → 错。

清单快照形状：

```ts
{
  category: 'common' | 'game',
  gameId: string | null,
  version: string,
  dependencies: string[],
  excludePaths: string[],
  requiredCommandScripts: string[],
  inspectionFile: string | null,
}
```

canonical JSON 字段顺序与 Rust 代码一致：`category`、`gameId`、`version`、`dependencies`、`excludePaths`、`requiredCommandScripts`、`inspectionFile`。

- [x] **步骤 2：实现 `hashAndValidate(zipBytes, manifest)`**

在 Worker 里解析 zip 条目，不要写本地磁盘。Markdown 引用检查对 zip 内路径做，禁止 `..` 越出包根。

- [x] **步骤 3：用 `mod-workflow` 真实目录打 zip 跑通，再 commit**

```powershell
git add apps/server
git commit -m "feat: 按现有 validate 规则校验 Skill zip"
```

---

### 任务 7：Skill 与版本 API

- [x] **任务 7 已完成**

**文件：**

- 创建：`apps/server/src/skills.ts`
- 测试：`apps/server/src/skills.test.ts`

- [x] **步骤 1：写失败测试**

1. 无游戏时创建 `kind=common` 成功。
2. `kind=game` 且 `gameId` 不存在 → 拒绝。
3. `kind=game` 且无游戏可选 → 拒绝。
4. 名称重复、名称非法 → 拒绝。
5. 上传 zip + 清单字段，版本数为 1，`fileId` 可 `GET /files/:fileId` 下载原 zip。
6. 第 6 个版本 → 拒绝，文案含「先移除旧版本」。
7. 同版本号重复 → 拒绝。
8. 文件变了版本号不变 → 拒绝。
9. 删一个版本后可再传；R2 在无引用时删除。
10. 非 admin → 403。
11. `GET /skills` 登录用户可见列表（含版本、fileId、manifest），不含 zip 字节。
12. 保存时 R2 成功、写 D1 失败（mock）→ 列表仍无新版本。

- [x] **步骤 2：实现**

`POST /skills` 创建记录（可 0 版本）。第一期允许空 Skill 实体，但 `GET` 给桌面的「可确认版本」为空。上传：`POST /skills/:id/versions` multipart：`zip` + `version` + 清单字段。先 R2（key=fileId UUID）再 insert 版本。

- [x] **步骤 3：测试通过后 commit**

```powershell
git add apps/server
git commit -m "feat: 实现 Skill 版本发布与下载"
```

---

### 任务 8：管理后台页面

- [x] **任务 8 已完成**

**文件：**

- 修改：`apps/admin/` 路由与页面
- 测试：`apps/admin` 里 Vitest 组件/请求测试（`pnpm exec vp test`）

页面：

- `/login` 注册与登录（Cookie 凭证）
- `/games` 游戏列表/创建/编辑/删除
- `/skills` Skill 列表、创建（选通用或游戏）、编辑说明与清单字段、上传文件夹（浏览器打 zip）或 zip、版本列表（最多 5）、删除版本、按版本下载
- 非 admin 登录后看不到游戏/Skill 管理，接口 403 时提示

- [x] **步骤 1：若模板无 vue-router，安装 vue-router，不要改用 create-vue**

- [x] **步骤 2：写登录页失败测试（提交后会打 `/auth/login`）再实现**

- [x] **步骤 3：游戏页、Skill 页同样 TDD：至少覆盖「无游戏可创建通用 Skill」「游戏 Skill 必须选游戏」「满 5 版本提示先删」**

文件夹上传：浏览器 `JSZip` 或等价库打包，根目录必须是 `SKILL.md` 那一层。

- [x] **步骤 4：`vp build` 能产出静态资源**

- [x] **步骤 5：Commit**

```powershell
git add apps/admin
git commit -m "feat: 实现游戏与 Skill 管理界面"
```

---

### 任务 9：桌面端登录门

- [x] **任务 9 已完成**

**仓库：** `D:\codetest\gen-mod`

**文件：**

- 创建：`src-tauri/src/cloud/auth.rs`、`src-tauri/src/cloud/mod.rs`
- 创建：`src/features/auth/LoginPage.vue`（或等价现有目录风格）
- 修改：路由，使未登录不能进工作台
- 修改：`src-tauri/src/lib.rs` 注册命令
- 测试：`src-tauri` 内 auth 命令测试（mock HTTP）

- [x] **步骤 1：写失败测试**

1. 无令牌调用需要登录的命令 → 错误，不清磁盘项目。
2. 登录成功把 access/refresh 写入应用配置目录，不是 Skill 目录。
3. access 过期则 refresh；refresh 返回 401 → 命令报凭证无效（前端回登录页）。
4. refresh 网络失败 → 错误信息，配置里的令牌仍在。

- [x] **步骤 2：实现 `cloud_register` / `cloud_login` / `cloud_logout` / `cloud_me`**

API 根地址放现有配置文件，不要写死生产域名在多处。

- [x] **步骤 3：前端未登录只渲染登录页**

- [x] **步骤 4：在 gen-mod 仓库 commit**

```powershell
cd D:\codetest\gen-mod
git add src src-tauri
git commit -m "feat: 工作台入口改为登录后进入"
```

---

### 任务 10：官方目录、确认更新、按文件 id 下载

- [x] **任务 10 已完成**

**仓库：** `D:\codetest\gen-mod`

**文件：**

- 创建：`src-tauri/src/cloud/catalog.rs`
- 创建：`src-tauri/src/skills/official.rs`（本机官方根目录、按 skillId/version 解压，不覆盖进行中目录）
- 修改：`src/contracts/skill.ts` 的 `source` 增加 `'official'`
- 修改：Skills 页或独立更新提示 UI
- 测试：Rust 测试用临时目录 + mock zip

- [x] **步骤 1：写失败测试**

1. 检查更新返回新游戏/新版本列表。
2. 未确认 → 本机官方目录无该版本。
3. 确认后下载 zip，解压到 `official/<skillName>/<version>/`，跑与服务端相同的 validate，哈希一致才写入「已确认」清单。
4. 校验失败 → 不写入已确认，不删已有文件。
5. 服务端已移除的版本不出现在提示里。
6. 不删除本机旧版本目录。

已确认清单建议：`official/confirmed.json`，记录 `skillId`、`name`、`version`、`contentHash`、`fileId`、`manifest`。

- [x] **步骤 2：实现检查/确认/下载命令与提示文案**

提示必须包含规格第 7 节那五条后果。

- [x] **步骤 3：gen-mod commit**

```powershell
git commit -m "feat: 官方 Skill 需用户确认后才下载"
```

---

### 任务 11：按游戏标识加载，替换 resolve(game_skill_name)

- [x] **任务 11 已完成**

**仓库：** `D:\codetest\gen-mod`

**文件（全部改掉按能力名 resolve 的路径）：**

- `src-tauri/src/skills/registry.rs`：新增 `resolve_for_game(app, game_id)`；`list()` 合并 official 已确认 + user 导入；不再要求资源目录 `skills/registry.json` 必须存在
- `src-tauri/src/storage/mods.rs`：`create_mod(..., game_id)`，校验「该游戏至少有一个已确认官方游戏 Skill」
- `src/features/mods/NewModDialog.vue`：下拉改为已同步游戏，且过滤没有已确认官方游戏 Skill 的项
- `src-tauri/src/pi/bridge.rs`（约 500、763、1067 行）
- `src-tauri/src/artifacts/registry.rs`
- `src-tauri/src/game_inspection/mod.rs`
- `src-tauri/src/knowledge/usage.rs`、`evidence.rs`
- `src-tauri/src/source_files/mod.rs`
- `src-tauri/src/pi/workspace.rs`
- `src-tauri/src/skills/registry.rs` `refresh_sessions`：与 `resolve_for_game(project.game_id)` 的快照比较
- 测试：`src-tauri/src/project_lifecycle/tests.rs` 以及 registry 单测

加载规则（写进测试）：

```text
views = 已确认官方（每 skill 取 uploadedAt 最新已确认版本）∪ 用户导入
加载 = views 中 enabled 且 (category==common 或 gameId==所选游戏)
若没有任何 enabled 的官方 category==game 且 gameId==所选游戏 → 禁止 create_mod / 禁止新会话
```

- [x] **步骤 1：先写 `resolve_for_game` 单测**（临时目录布置一个官方游戏 Skill + 一个通用 + 一个导入）

- [x] **步骤 2：把所有 `resolve(&app, &project.game_skill_name)` 换成 `resolve_for_game(&app, &project.game_id)`**

`game_skill_name` 字段可继续写入历史值（例如已确认官方游戏 Skill 的 name 之一）以免旧 UI 崩，但加载不得再用它。`NewModDialog` 与 `create_mod` 参数改为 `gameId`。

- [x] **步骤 3：刷新会话只读测试：确认更新后旧快照会话 `read_only=true`；进行中不删旧目录**

- [x] **步骤 4：gen-mod commit**

```powershell
git commit -m "feat: 按游戏标识加载官方与导入 Skill"
```

---

### 任务 12：导入约束与安装包去掉内置 Skill

- [x] **任务 12 已完成**

**仓库：** `D:\codetest\gen-mod`

**文件：**

- `src-tauri/src/skills/registry.rs` `import_skill`
- `src-tauri/tauri.conf.json` 删除 `"../skills/": "skills/"`
- `builtin_root`：安装包不再有该资源时，`list` 不读内置 registry，只读 official + user
- 测试：导入未知 `gameId` 失败；导入与官方 `name` 冲突失败；通用导入仍成功

- [x] **步骤 1：写失败测试并改 `import_skill`**

在现有 `validate` 之后增加：

- `category==game` 时 `game_id` 必须存在于已同步游戏列表
- `name` 不得与已确认官方 Skill 名称相同
- 仍不得覆盖已有导入名

- [x] **步骤 2：去掉 bundle resources 里的 skills**

开发模式 `cfg!(debug_assertions)` 也不再把仓库 `skills/` 当官方来源。开发调试请走管理端发布或本机导入。仓库里的 `skills/` 仍可作为任务 6/7 打 zip 的夹具来源。

- [x] **步骤 3：跑 `src-tauri` 相关测试与 `builtin_resources_match_registry...`——若该测试依赖打包内置，改为对夹具目录调用 validate，或删掉对 builtin_root 的断言**

- [x] **步骤 4：gen-mod commit**

```powershell
git commit -m "feat: 导入受官方游戏约束且安装包不再带 Skill"
```

---

## 规格覆盖对照

| 规格章节 | 任务 |
| --- | --- |
| §10 官方脚手架、Vite+ 不用 `--directory` | 1 |
| §3–4 账号、Cookie/令牌、ADMIN_EMAILS | 4、9 |
| §5 游戏管理 | 5、8 |
| §6 清单字段在 D1、zip 文件本体、5 版本、哈希、file id | 2、6、7、8 |
| §7 确认更新、不删本机、按游戏加载、已有项目 | 10、11 |
| §7–8 导入约束、下载后校验 | 10、12 |
| §7 安装包不带 Skill | 12 |
| §9 测试项 | 各任务测试步骤 |
| Cloudflare D1/R2、先 R2 后 D1 | 3、7 |

## 计划自检

- 无 TODO/待定占位。
- `resolve_for_game`、`fileId`、`ManifestSnapshot`、`kind` 前后任务同名。
- `create_mod` 从 `game_skill_name` 改为 `gameId` 的调用链已列出全部已知源码位置。

## 2026-10-28 反馈复核与修正

原任务勾选只记录当时实施步骤，不代表完整的交互验收。用户反馈后补充修正如下：

- [x] 任务 8：参考 `D:\code\game-platform-admin`，页面迁至 `src/views/<模块>/index.vue`，拆分页面组件、API 模块、布局、状态与 composable；使用异步组件、类型化事件与 `defineModel`，整理单行压缩代码。
- [x] 任务 7–8：说明与文件在一次发布请求中校验，说明、清单和版本在同一个 D1 batch 保存；写入失败保持原数据。补齐包内文件删除、清单数组表单、加载失败重试与登录失效处理。
- [x] 任务 4：角色写入 D1，仅注册或登录时按 `ADMIN_EMAILS` 更新；提供旧账号数据不丢失的增量迁移与本地配置说明。
- [x] 任务 7：发布期间并发出现重复版本时明确返回 409，不再返回通用 500。
- [x] 任务 10：旧版本说明使用包内经过内容哈希验证的内容；所有选中包校验成功后才统一登记确认结果，批量失败不提前切换部分版本；版本显示文本与 Windows 目录名限制分开。

本轮功能提交：

- `gen-mod-admin`：`0f436bf`（服务端角色与发布一致性）；`677469f`（管理端页面结构与编辑流程）。
- `gen-mod`：`3220410`（旧版 Skill 校验、整批确认与目录映射）。原有未提交改动均保留，未包含在该提交。

本轮实际验证：

| 工作目录 | 命令 | 结果 |
| --- | --- | --- |
| `gen-mod-admin` | `bun test apps/server/src` | 19 通过，0 失败；含角色迁移与发布回归测试 |
| `gen-mod-admin` | `pnpm --dir apps/admin exec vp test run` | 14 通过，0 失败 |
| `gen-mod-admin` | `pnpm --dir apps/admin exec vp fmt src --write` | 完成格式化 |
| `gen-mod-admin` | `pnpm --dir apps/admin exec vp lint src --vue-plugin --deny-warnings` | 退出码 0 |
| `gen-mod-admin` | `pnpm --dir apps/admin exec vue-tsc --build` | 退出码 0 |
| `gen-mod-admin` | `pnpm --dir apps/admin exec vp build` | 退出码 0 |
| `gen-mod-admin` | `node apps/admin/node_modules/typescript/bin/tsc --noEmit -p apps/server/tsconfig.json` | 退出码 0 |
| `gen-mod-admin` | `pnpm --filter server exec wrangler deploy --dry-run` | API Worker 打包成功，未部署 |
| `gen-mod-admin` | `pnpm --filter server exec wrangler deploy --dry-run --config ../admin/wrangler.jsonc` | 管理端 Worker 与静态资源打包成功，未部署 |
| `gen-mod` | `cargo test --manifest-path src-tauri/Cargo.toml -j 1 --config 'profile.test.package.gen-mod.debug=0' --config 'profile.test.package.gen-mod.codegen-units=8' --lib` | 77 通过，0 失败，0 忽略 |
| `gen-mod` | `codegraph sync`、`codegraph status` | 索引已同步，up to date |

另外在全新临时目录运行 `wrangler d1 execute --local` 与 `wrangler dev --local --port 18787`，通过本地 D1/R2 的 26 项真实 HTTP 检查：注册登录、Cookie/令牌、游戏编辑与绑定、版本发布/上限/冲突、按 fileId 下载、移除版本以及普通用户权限。验证结束已停止本次 Worker。

未进行浏览器人工交互验收、桌面端真实游戏任务验收、远端 Cloudflare 联调、远端迁移或部署。未推送。

## 2026-10-28 Elysia 最佳实践优化

依据用户指定的 [Elysia Best Practice](https://elysiajs.com/essential/best-practice)，仅调整 `apps/server`：

- [x] 将账号、游戏和 Skill 按功能组织到 `src/modules`，分别由 Elysia controller、schema model、业务 service 承担 HTTP、校验及存储逻辑；路由测试随模块归并，删除已替代的根目录路由文件。
- [x] 鉴权改为命名插件的 `authorize` macro，使用 Elysia Cookie schema 与原生 Cookie 处理；业务服务不接收 Elysia Context 或原始 Request。
- [x] 请求类型由 schema 的 `.static` 推导，为 JSON 响应增加模型校验；持久化的清单 JSON 也复用相同 schema 解码，删除 DTO 强制转换。
- [x] 上传使用 `t.File`、数组 JSON 解码和可空路径转换，非法 JSON/非文件请求在存储写入前拒绝，明确返回 400。新增测试先复现原有 500，再验证修复。
- [x] 使用命名业务错误处理和 `Cloudflare.Env` 绑定声明，移除未使用的 env decorator、入口双重断言及生产代码显式 `any`；包校验按职责拆分，保留 canonical hash 金样本。
- [x] 验证原有 URL、凭证、角色时机、版本限制、fileId 下载和先 R2 后 D1 的行为；未增加依赖，未修改数据库 schema 或迁移。

功能提交：`6aaf88d`（`refactor: 按 Elysia 最佳实践拆分服务端模块`）。

实际检查命令（仓库根目录）：

```powershell
bun test apps/server/src
pnpm --dir apps/admin exec vp fmt 'D:/codetest/gen-mod-admin/apps/server/src' --write
pnpm --dir apps/admin exec vp lint 'D:/codetest/gen-mod-admin/apps/server/src' --deny-warnings
node apps/admin/node_modules/typescript/bin/tsc --noEmit -p apps/server/tsconfig.json
pnpm --filter server exec wrangler deploy --dry-run
git diff --check
```

结果：23 项服务端测试通过，0 失败；格式、lint、类型检查及 API Worker 打包成功。在新的临时本地 D1/R2 环境启动 Worker（18788 端口），31 项真实 HTTP 检查通过，包含 multipart 清单解码、非法上传拒绝、Cookie/令牌鉴权、版本冲突/上限和文件下载。验证结束已停止本次 Worker。未运行管理端或桌面端检查，未执行远端部署或推送。

## 2026-10-28 真实浏览器回归

通过内置浏览器实际点击、输入、选择文件和下载，访问 `http://127.0.0.1:5173`；Vite `/api` 代理到本地 Worker `http://127.0.0.1:8787`。数据使用 `%TEMP%\genmod-browser-test-20261028` 中独立的 D1/R2，没有替换已有数据库。

| 实测流程 | 浏览器观察结果 |
| --- | --- |
| 未登录访问、错误密码、注册与登录 | 未登录进入登录页；错误密码明确提示；管理员注册登录后进入游戏管理 |
| 普通账号注册与管理路由权限 | 只显示账号页；没有管理导航；直接访问 `/games` 仍回到账号页 |
| 无游戏时的 Skill 创建 | 游戏 Skill 显示需先创建游戏；通用 Skill 创建成功 |
| 游戏创建、编辑与刷新 | 创建和修改实际保存；编辑时标识不可改；刷新后名称和说明保持 |
| 游戏 Skill 绑定 | 可选择刚创建的游戏并保存，编辑器显示绑定游戏标识 |
| 页面新建文本文件并发布 | 新建 `SKILL.md`、编辑内容后发布成功，版本列表增长 |
| 导入 zip 与上传文件夹 | 都通过真实文件选择器操作；SKILL.md、脚本、资料和二进制文件均载入；文件夹内容发布成功 |
| 清单编辑与版本快照 | 依赖、排除路径、必需脚本随版本发布；重新加载版本后恢复 |
| 无效 Markdown 引用 | 服务端返回 400，页面显示具体缺失路径；版本列表不增长，输入和编辑内容保留 |
| 修改说明与文件后再发布 | 同次发布成功；新版本号清空，不再与成功提示同时误报重复 |
| 重复版本与五版本上限 | 重复版本号按钮禁用并提示；达到 5 版后第 6 版按钮禁用 |
| 真实浏览器下载 | 实际取得 zip；解包核对新说明、脚本、引用资料和二进制原字节 `[0,255,1,128,10]` 一致 |
| API 中断与恢复 | 停止本次 API 后页面提示 502，但登录仍保留；恢复服务后点“重新加载”成功，五个版本仍在 |
| 最终刷新与控制台 | Cookie 登录和数据保持；修复后未再捕获 Vue warn/error |

本轮发现并修复：

- [x] 发布成功后版本号未清空，导致误报重复。通过 `defineModel` 让版本输入与发布状态共用数据，成功才清空，失败保留。
- [x] App 向所有路由页面传递登录事件，产生非 emits 监听器警告。仅命名登录路由接收该事件。
- [x] 登录失败后切换注册仍显示旧错误。切换模式时清空旧请求错误。
- [x] 深色侧栏中的退出按钮文字继承浅色而对比不足。增加局部样式，并在浏览器核对为绿色文字、白色背景。

修复提交：`529a87f`（`fix: 修正浏览器回归发现的页面状态问题`）。

前三项回归在修改前实际失败，修复后 `pnpm --dir apps/admin exec vp test run` 为 16 通过、0 失败。以下命令也退出码 0：

```powershell
pnpm --dir apps/admin exec vp fmt src --write
pnpm --dir apps/admin exec vp lint src --vue-plugin --deny-warnings
pnpm --dir apps/admin exec vue-tsc --build
pnpm --dir apps/admin exec vp build
git diff --check
```

截图保存在本次 Codex visualizations 目录：`browser-games-final.jpg`、`browser-skill-published.jpg`、`browser-final-skill.jpg`、`browser-version-limit.jpg`、`browser-player-permission.jpg`、`browser-api-error-keeps-session.jpg`。

本轮没有实际删除游戏或已发布版本，没有执行桌面端真实游戏任务、远端部署或推送。结束时保留本地 5173/8787 服务和测试管理员浏览器页面，供继续查看。

## 2026-10-28 管理界面与文件工作区改版

- [x] 使用 shadcn-vue 官方 Vite 接入流程和官方 CLI 生成基础组件，统一导航、按钮、输入、对话框和页签；游戏管理改为表格与新增/编辑对话框。
- [x] Skill 管理拆为列表、新增、编辑路由，支持游戏与名称筛选；创建后身份不变，继续使用原有 API 与版本规则。
- [x] 新建默认 `SKILL.md`；增加可展开/调整宽度的文件树、多文件页签、Monaco 代码编辑器、Markdown 预览、重命名和删除，保留任意 UTF-8 文本及二进制原字节。
- [x] 增加离开、替换文件、加载历史版本前的修改保护；取消退出不清登录凭证，失败发布保留内容，清单单独保存不会误清文件修改状态。
- [x] 按用户最新要求移除全部移动端断点与响应式类，采用最小宽度 1200px 的固定桌面布局；用户手动收起文件树、清单的功能保留。
- [x] 运行管理端 36 项测试、Vue lint、类型检查、生产构建与管理端 Worker dry-run，并执行真实浏览器创建、编辑、发布、上传和下载验证。

功能提交：`e3967e0`（`refactor: 使用 shadcn-vue 重建管理界面与文件编辑器`）。具体施工顺序、失败与修复记录、最终命令见 [本轮计划](./2026-10-28-admin-ui.md)。所有原任务勾选保持不变。

最终验证：`vp test run --maxWorkers=2` 为 36 通过、0 失败；`vp lint src --vue-plugin --deny-warnings --threads=2`、`vue-tsc --build`、`vp build` 和 `wrangler deploy --dry-run --config ../admin/wrangler.jsonc` 均退出码 0，dry-run 读取 152 个静态资源，未部署。构建保留 Monaco 大 chunk 提示；本机不限并发时的资源不足已通过限制线程、短暂停止并恢复本次 Vite 服务解决。

真实浏览器成功发布并下载 `studio-workflow/1.0.0`，只读解包核对 Python、JSON 和入口文件；二进制单文件下载字节为 `[0,255,1,128,10]`。验证了 zip/文件夹导入、游戏创建与编辑、五版本限制、取消离开/退出与撤销、历史版本恢复。最后重启服务后的浏览器控制台没有捕获 warn/error。截图位于本次 visualizations 目录的 `admin-studio-editor.jpg` 和 `admin-skill-list.jpg`。

本轮只改管理端及文档、依赖锁文件，没有修改服务端、数据库或桌面端。没有永久删除游戏或版本，没有远端迁移、实际部署或推送。继续保留本地 5173/8787 服务。
