# 云服务器最小 demo

当前使用 Elysia + Bun + 本地 SQLite，管理端为 Vue 静态页面，Skill zip 存七牛私有空间。文件压缩、解压、内容校验和 canonical hash 在前端完成；前端直接向七牛传文件，API 只负责权限、凭证、元数据和版本规则。

## 配置

从仓库根目录执行：

```powershell
pnpm install --frozen-lockfile
Copy-Item apps/server/.env.example apps/server/.env
```

编辑 apps/server/.env，填写 JWT_SECRET、ADMIN_EMAILS 和七牛配置。不要将真实密钥提交到 Git。

| 配置                               | 含义                                                           |
| ---------------------------------- | -------------------------------------------------------------- |
| JWT_SECRET                         | 登录令牌密钥，自行生成并在重启时保持不变                       |
| ADMIN_EMAILS                       | 管理员邮箱，多个用逗号分隔；注册或登录时确定角色               |
| DATABASE_PATH                      | SQLite 文件位置，默认 ./data/gen-mod.sqlite，相对 API 工作目录 |
| QINIU_ACCESS_KEY、QINIU_SECRET_KEY | 仅在 API 服务端保存的七牛密钥                                  |
| QINIU_BUCKET                       | 正式 Skill 文件所在的私有空间                                  |
| QINIU_UPLOAD_URL                   | 与空间区域匹配的 HTTPS 上传地址                                |
| QINIU_RESOURCE_URL                 | 七牛资源管理地址，用于查询元信息和删除文件                     |
| QINIU_DOWNLOAD_URL                 | 私有空间的 HTTPS 下载域名，不带文件路径                        |
| HOST、PORT                         | API 监听地址和端口；原生默认 127.0.0.1:8787                    |
| CORS_ORIGINS                       | 前后端跨域部署时的管理端完整来源白名单                         |
| COOKIE_SECURE                      | HTTPS 反向代理部署时设置为 true                                |

七牛上传凭证限定唯一 Key、仅允许新增、有效期 10 分钟，单个 zip 最大 **10 MB（10,000,000 字节）**。七牛下载链接有效期 10 分钟。压缩包内容不经过 API。

七牛下载域名须支持 HTTPS 与浏览器 CORS。请求七牛时不携带业务 API 的 Cookie 或 Authorization。前端内容哈希使用 Web Crypto，因此请使用 HTTPS 或 localhost 打开管理端；公网 HTTP IP 地址不能完成发布。

## 本地开发

需要 Bun、Node.js 和根 package.json 指定的 pnpm。编辑 .env 后分别启动：

```powershell
pnpm dev:api
pnpm dev:admin
```

API 默认 http://127.0.0.1:8787，管理端使用 Vite 提示的本地地址。前端默认请求 /api，由 Vite 转发给本地 API。也可通过 apps/admin/.env 的 VITE_API_URL 指定独立 API 地址。

首次运行自动初始化一个全新 SQLite 数据库；后续启动保留已有文件。本 demo 不迁移旧 D1 或本地 Wrangler 数据，请指定新的 DATABASE_PATH。

七牛配置未填写时，可以开发登录与游戏管理；上传、发布和文件下载需要真实七牛配置。使用 ADMIN_EMAILS 中的邮箱注册，再创建游戏和 Skill。

## Docker Compose

配置 apps/server/.env 后，在仓库根目录执行：

```sh
docker compose up -d --build
```

本机访问 http://localhost:8080。管理端 Nginx 将 /api 转发给 API，SQLite 使用 server-data 持久化卷。云服务器公网访问需由部署入口配置 HTTPS；入口和域名本轮不固定。也可用 SSH 转发到 localhost 查看 demo。

更换程序时重新执行同一命令。需要查看日志时使用 docker compose logs。不要删除数据卷，数据卷与容器生命周期独立。

## 不使用 Docker

在 Linux 安装 Node.js、pnpm、Bun，复制代码到 /opt/gen-mod-admin 并安装依赖：

```sh
pnpm install --frozen-lockfile
cp apps/server/.env.example apps/server/.env
# 编辑 .env 后构建前端
pnpm --filter gen-mod-admin-ui build
# 当前终端运行 API
cd apps/server
bun run src/index.ts
```

正式保活可使用 scripts/gen-mod-api.service：按实际位置修改 WorkingDirectory、EnvironmentFile 和 Bun 路径，再安装到 systemd。该文件只管理 API；管理端 dist 目录交给已有静态 Web 服务发布。

同源发布可参考 scripts/nginx.conf，把 proxy_pass 中的 server:8787 改成 127.0.0.1:8787，并将 root 改为 apps/admin/dist 的实际绝对路径。HTTPS 入口和证书由部署环境配置，同时设置 COOKIE_SECURE=true。独立域名发布时，在构建前设置 VITE_API_URL，并配置 API 的 CORS_ORIGINS。

## SQLite 手动快照

原生部署在仓库根目录执行：

```sh
pnpm backup
```

快照写入 apps/server/backups，使用 SQLite VACUUM INTO 生成一致副本。也可以指定一个尚不存在的目标路径：

```sh
pnpm --filter server backup /absolute/path/snapshot.sqlite
docker compose exec server bun run src/backup.ts /data/backups/snapshot.sqlite
```

恢复时先停止 API，备份当前整个数据目录，将选择的快照放到一个新位置，再把 DATABASE_PATH 指向该文件并启动 API。快照不包含七牛文件，无法恢复已经删除的 zip。

每日调度、上传快照到独立七牛备份空间、保留 7 天及自动回退，均留待后续补充。

## demo 边界

- 发布顺序：前端固定文件与清单 → 校验并计算 hash → 压缩 → 申请凭证 → 直传七牛 → 提交 JSON 版本数据。
- 下载：API 鉴权后签发私有链接，前端直连七牛；/files/:fileId 保留重定向形式供客户端使用。
- 上传或发布失败时，前端请求清理接口，后端只删除未被正式版本引用的上传对象。浏览器直接关闭后的遗留上传不自动回收。
- 保留现有账号权限、游戏关联、版本号唯一与最多 5 个版本的规则。
- 不实现后台清理、自动重试、断点恢复、服务端 zip 解压或旧数据迁移。
- 既有 D1/R2 测试夹具及 multipart 发布测试尚未改为新契约，本轮不执行测试；本地静态检查不能替代真实七牛上传、下载与部署验证。

参考：[七牛上传策略](https://developer.qiniu.com/kodo/manual/put-policy)、[私有下载](https://developer.qiniu.com/kodo/1656/download-private)、[SQLite 快照](https://www.sqlite.org/backup.html)。
