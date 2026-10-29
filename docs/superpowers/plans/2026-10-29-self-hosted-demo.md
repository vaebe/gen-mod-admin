# 云服务器最小 demo 实现计划

目标：使用现有登录、游戏和 Skill 管理页面，打通 Bun + SQLite 与七牛前端直传、直下。

按用户最新要求直接实现，复用现有库，不新增 SDK。使用 writing-plans 和 vue-best-practices 技能；本次不运行测试、启动应用、提交或部署。

- [x] 后端入口切换为 Bun，业务 SQL 改用原生 SQLite，首次运行初始化全新数据库。
- [x] 七牛原生签名与上传记录：签发 10 MB 上传凭证、保存版本、提供下载链接、前端请求清理。
- [x] 复用现有内容校验与 canonical hash，移至前端调用；前端直接上传和下载，发布期间禁用编辑。
- [x] 提供 Compose 与原生部署入口、SQLite 手动快照命令，替换 Cloudflare 部署说明与自动发布工作流。
- [x] 执行受影响模块类型检查、差异检查；不把静态检查表述为真实七牛联调。

demo 不实现：定时备份、备份上传与保留调度、自动重试、后台清理任务、上传恢复状态机、服务端 zip 处理、解压资源隔离和历史数据迁移。域名和 HTTPS 入口在部署时配置。

验证记录：后端 tsc --noEmit、前端 vue-tsc --noEmit、管理端 vp build、docker compose config --no-env-resolution --quiet 和 git diff --check 均通过。前端构建保留 Monaco 大包提示。沙箱内曾因 Windows realpath 权限失败，并行检查曾遇到内存不足；改为正常文件权限下顺序检查后通过。未运行测试、启动应用、构建 Docker 镜像或调用真实七牛账号。既有 D1/R2 夹具及 multipart 发布测试未迁移到新契约。
