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

**文件：**

- 修改：`apps/admin/` 路由与页面
- 测试：`apps/admin` 里 Vitest 组件/请求测试（`pnpm exec vp test`）

页面：

- `/login` 注册与登录（Cookie 凭证）
- `/games` 游戏列表/创建/编辑/删除
- `/skills` Skill 列表、创建（选通用或游戏）、编辑说明与清单字段、上传文件夹（浏览器打 zip）或 zip、版本列表（最多 5）、删除版本、按版本下载
- 非 admin 登录后看不到游戏/Skill 管理，接口 403 时提示

- [ ] **步骤 1：若模板无 vue-router，安装 vue-router，不要改用 create-vue**

- [ ] **步骤 2：写登录页失败测试（提交后会打 `/auth/login`）再实现**

- [ ] **步骤 3：游戏页、Skill 页同样 TDD：至少覆盖「无游戏可创建通用 Skill」「游戏 Skill 必须选游戏」「满 5 版本提示先删」**

文件夹上传：浏览器 `JSZip` 或等价库打包，根目录必须是 `SKILL.md` 那一层。

- [ ] **步骤 4：`vp build` 能产出静态资源**

- [ ] **步骤 5：Commit**

```powershell
git add apps/admin
git commit -m "feat: 实现游戏与 Skill 管理界面"
```

---

### 任务 9：桌面端登录门

**仓库：** `D:\codetest\gen-mod`

**文件：**

- 创建：`src-tauri/src/cloud/auth.rs`、`src-tauri/src/cloud/mod.rs`
- 创建：`src/features/auth/LoginPage.vue`（或等价现有目录风格）
- 修改：路由，使未登录不能进工作台
- 修改：`src-tauri/src/lib.rs` 注册命令
- 测试：`src-tauri` 内 auth 命令测试（mock HTTP）

- [ ] **步骤 1：写失败测试**

1. 无令牌调用需要登录的命令 → 错误，不清磁盘项目。
2. 登录成功把 access/refresh 写入应用配置目录，不是 Skill 目录。
3. access 过期则 refresh；refresh 返回 401 → 命令报凭证无效（前端回登录页）。
4. refresh 网络失败 → 错误信息，配置里的令牌仍在。

- [ ] **步骤 2：实现 `cloud_register` / `cloud_login` / `cloud_logout` / `cloud_me`**

API 根地址放现有配置文件，不要写死生产域名在多处。

- [ ] **步骤 3：前端未登录只渲染登录页**

- [ ] **步骤 4：在 gen-mod 仓库 commit**

```powershell
cd D:\codetest\gen-mod
git add src src-tauri
git commit -m "feat: 工作台入口改为登录后进入"
```

---

### 任务 10：官方目录、确认更新、按文件 id 下载

**仓库：** `D:\codetest\gen-mod`

**文件：**

- 创建：`src-tauri/src/cloud/catalog.rs`
- 创建：`src-tauri/src/skills/official.rs`（本机官方根目录、按 skillId/version 解压，不覆盖进行中目录）
- 修改：`src/contracts/skill.ts` 的 `source` 增加 `'official'`
- 修改：Skills 页或独立更新提示 UI
- 测试：Rust 测试用临时目录 + mock zip

- [ ] **步骤 1：写失败测试**

1. 检查更新返回新游戏/新版本列表。
2. 未确认 → 本机官方目录无该版本。
3. 确认后下载 zip，解压到 `official/<skillName>/<version>/`，跑与服务端相同的 validate，哈希一致才写入「已确认」清单。
4. 校验失败 → 不写入已确认，不删已有文件。
5. 服务端已移除的版本不出现在提示里。
6. 不删除本机旧版本目录。

已确认清单建议：`official/confirmed.json`，记录 `skillId`、`name`、`version`、`contentHash`、`fileId`、`manifest`。

- [ ] **步骤 2：实现检查/确认/下载命令与提示文案**

提示必须包含规格第 7 节那五条后果。

- [ ] **步骤 3：gen-mod commit**

```powershell
git commit -m "feat: 官方 Skill 需用户确认后才下载"
```

---

### 任务 11：按游戏标识加载，替换 resolve(game_skill_name)

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

- [ ] **步骤 1：先写 `resolve_for_game` 单测**（临时目录布置一个官方游戏 Skill + 一个通用 + 一个导入）

- [ ] **步骤 2：把所有 `resolve(&app, &project.game_skill_name)` 换成 `resolve_for_game(&app, &project.game_id)`**

`game_skill_name` 字段可继续写入历史值（例如已确认官方游戏 Skill 的 name 之一）以免旧 UI 崩，但加载不得再用它。`NewModDialog` 与 `create_mod` 参数改为 `gameId`。

- [ ] **步骤 3：刷新会话只读测试：确认更新后旧快照会话 `read_only=true`；进行中不删旧目录**

- [ ] **步骤 4：gen-mod commit**

```powershell
git commit -m "feat: 按游戏标识加载官方与导入 Skill"
```

---

### 任务 12：导入约束与安装包去掉内置 Skill

**仓库：** `D:\codetest\gen-mod`

**文件：**

- `src-tauri/src/skills/registry.rs` `import_skill`
- `src-tauri/tauri.conf.json` 删除 `"../skills/": "skills/"`
- `builtin_root`：安装包不再有该资源时，`list` 不读内置 registry，只读 official + user
- 测试：导入未知 `gameId` 失败；导入与官方 `name` 冲突失败；通用导入仍成功

- [ ] **步骤 1：写失败测试并改 `import_skill`**

在现有 `validate` 之后增加：

- `category==game` 时 `game_id` 必须存在于已同步游戏列表
- `name` 不得与已确认官方 Skill 名称相同
- 仍不得覆盖已有导入名

- [ ] **步骤 2：去掉 bundle resources 里的 skills**

开发模式 `cfg!(debug_assertions)` 也不再把仓库 `skills/` 当官方来源。开发调试请走管理端发布或本机导入。仓库里的 `skills/` 仍可作为任务 6/7 打 zip 的夹具来源。

- [ ] **步骤 3：跑 `src-tauri` 相关测试与 `builtin_resources_match_registry...`——若该测试依赖打包内置，改为对夹具目录调用 validate，或删掉对 builtin_root 的断言**

- [ ] **步骤 4：gen-mod commit**

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
