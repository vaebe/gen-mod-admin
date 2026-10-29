# GenMod API

Elysia + Bun + SQLite，Skill 文件使用七牛私有存储。

在仓库根安装依赖并复制本目录 .env.example 为 .env，填写登录密钥和七牛配置。

- 开发：pnpm dev:api（根目录）
- 启动：bun run src/index.ts（本目录）
- 类型检查：pnpm --filter server type-check（根目录）
- 手动快照：pnpm backup（根目录）

完整配置、Compose 与原生部署见 [部署说明](../../docs/deployment.md)。

zip 的校验、哈希、压缩和解压由管理端前端执行。API 保留登录、元数据、上传凭证、版本确认、私有下载链接及文件删除接口，不传输文件内容。
