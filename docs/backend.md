# 云端服务与自行部署

默认试用服务：`https://classdrop-homework-20261102.astral-sky-1170.chatgpt.site`。这是公开网页入口，不是密钥。安装客户端不会赋予其他人的收件管理权限；各个收件入口仍验证其管理者身份。

`web/` 是与客户端配套的服务快照，使用 Vinext、Cloudflare Workers、D1、R2，保留了 Sites 构建集成。公开副本的 `.openai/hosting.json` 只保留逻辑存储绑定，没有原部署的 project_id。

## 本地开发

在 `web/` 中执行：

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm run dev -- --port 5173
```

如生成配置没有声明 migrations_dir，请按 `drizzle/meta/_journal.json` 的顺序，对每个迁移 SQL 使用 `d1 execute DB --local ... --file drizzle/文件名.sql`；不要重复应用已经执行的迁移。迁移文件和元数据不可随意修改。

本地通过 `/account` 注册自己的测试账号；本地和线上数据库、文件存储分别独立。`tests/smoke.py` 与 `tests/release_checks.py` 只应对本地5173端口运行，不应指向生产数据。

## 正式托管的必要条件

- 配置真实 D1 和 R2；不要把本地 `.wrangler` 数据上传到 GitHub。
- 当前身份验证使用自己的用户名、加盐密码派生和数据库会话。无外部平台登录依赖。
- 生产环境必须使用HTTPS，保护D1/R2访问凭证；用户会话Cookie使用Secure、HttpOnly、SameSite=Lax。
- 可选的旧版数据导入仅供受信任的原托管环境迁移，默认关闭。不要在独立部署上启用 `LEGACY_ACCOUNT_LINKING_ENABLED`，更不能将客户端可伪造的身份头当作可信身份。
- 文件管理接口验证任务所有者，公共提交接口只提供上传。
- 新文件保存30天，超期立即停止下载。后台清理入口为 `POST /api/maintenance/expire`，只按服务端当前时间清理已到期文件，不接受调用方选定的文件、用户或时间，也不返回用户数据。自行部署时应配置自己的定时调度。
- 回收站不延长30天期限；历史没有 expires_at 的记录不自动过期。
- 目前单文件20MB、单次50MB/5个文件、单入口1GB、管理账号5GB，并通过数据库原子容量预留限制并发写入。

在桌面设置中替换服务地址仅改变当前客户端连接，不会迁移其他云端服务的数据或账号。

账号测试：在本地服务运行时执行 `python3 tests/account_checks.py`。测试使用随机的本地测试账号，不包含固定管理员密码。注册和登录有频率限制，短时间内反复运行测试可能被限制，应使用独立测试数据库。
