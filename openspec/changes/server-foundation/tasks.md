## 1. 项目初始化

- [ ] 1.1 执行 `npm init -y`，设置 `name`、`version`、`description`
- [ ] 1.2 安装运行时依赖：`fastify`、`@fastify/jwt`、`@fastify/sensible`、`pino`、`pino-pretty`、`zod`、`dotenv`、`@prisma/client`、`bcrypt`
- [ ] 1.3 安装开发依赖：`typescript`、`tsx`、`prisma`、`@types/node`、`@types/bcrypt`、`eslint`、`@typescript-eslint/parser`、`@typescript-eslint/eslint-plugin`、`prettier`、`eslint-config-prettier`
- [ ] 1.4 写 `tsconfig.json`：`strict: true`、`target: ES2022`、`moduleResolution: Bundler`、`outDir: dist`
- [ ] 1.5 写 `.eslintrc.json`（TypeScript 规则 + prettier 集成）
- [ ] 1.6 写 `.prettierrc`
- [ ] 1.7 在 `package.json` 中添加 npm scripts：`build`（tsc）、`dev`（tsx watch src/main.ts）、`start`（node dist/main.js）、`lint`、`typecheck`
- [ ] 1.8 写 `.gitignore`（含 `.env`、`dist/`、`*.db`、`node_modules/`）
- [ ] 1.9 写 `.env.example`（DATABASE_URL、NODE_ENV、JWT_SECRET、PORT、LOG_LEVEL、JWT_EXPIRES_IN、DEEPSEEK_API_KEY、FIELD_ENCRYPTION_KEY）

## 2. 目录结构

- [ ] 2.1 创建 `src/interface/`、`src/application/`、`src/domain/`、`src/infrastructure/` 目录
- [ ] 2.2 创建 `src/domain/repositories/`（存放 repository 接口定义）
- [ ] 2.3 创建 `src/infrastructure/database/`（存放 Prisma client 和 repository 实现）
- [ ] 2.4 在 `src/domain/types/auth.ts` 中定义 `AuthContext` / `UserScope` 类型（含 `userId`、`email`、`username`），供 interface 层生成、application 层传递、repository 层消费

## 3. 类型安全配置

- [ ] 3.1 写 `src/config.ts`：Zod schema 定义所有环境变量，必填项含 `DATABASE_URL`、`NODE_ENV`、`JWT_SECRET`
- [ ] 3.2 可选项含默认值：`PORT=3000`、`LOG_LEVEL=info`、`JWT_EXPIRES_IN=7d`
- [ ] 3.3 校验失败时 `process.exit(1)` 并打印明确错误，在任何端口绑定前执行

## 4. HTTP 服务器

- [ ] 4.1 写 `src/server.ts`：`buildServer()` 异步工厂，创建 Fastify 实例并配置 pino logger
- [ ] 4.2 注册 `GET /health` 路由，返回 `{ "status": "ok" }`，无需认证
- [ ] 4.3 注册全局 404 handler，返回 `{ "error": "Not Found" }`
- [ ] 4.4 注册全局 error handler，production 环境返回 `{ "error": "Internal Server Error" }`，不暴露 stack trace
- [ ] 4.5 注册 SIGTERM handler，调用 `server.close()` 优雅关闭
- [ ] 4.6 写 `src/main.ts`：调用 `buildServer()`，绑定至 `config.PORT`，输出启动日志

## 5. 数据库 Schema

- [ ] 5.1 执行 `npx prisma init --datasource-provider sqlite`
- [ ] 5.2 在 `prisma/schema.prisma` 中定义 `User` 模型（id UUID、email unique、username unique、passwordHash、createdAt、updatedAt）
- [ ] 5.3 定义 `Conversation` 模型（id、userId FK、createdAt、lastMessageAt）
- [ ] 5.4 定义 `Session` 模型（id、conversationId FK、userId FK、createdAt、updatedAt），添加索引 `(userId, updatedAt)`
- [ ] 5.5 定义 `ConversationMessage` 模型（id、sessionId FK、userId FK、role enum、content、reasoningContent?、toolCalls? Json、toolCallId?、createdAt）
- [ ] 5.6 定义 `Goal` 模型，添加索引 `(userId, status)`
- [ ] 5.7 定义 `Plan` 模型（goalId FK、userId FK）
- [ ] 5.8 定义 `Task` 模型，添加索引 `(userId, status, dueAt)`
- [ ] 5.9 定义 `Reminder` 模型，添加索引 `(userId, status, remindAt)`
- [ ] 5.10 定义 `Memory` 模型，添加索引 `(userId, type)`
- [ ] 5.11 定义 `ToolCall` 模型（toolName、input Json、output Json?），添加索引 `(userId, toolName, createdAt)`
- [ ] 5.12 定义 `PermissionDecision` 模型（toolCallId FK、decision enum）
- [ ] 5.13 定义 `Notification` 模型（channel、status、payload Json）
- [ ] 5.14 定义 `ChannelBinding` 模型（channel、externalId）
- [ ] 5.15 定义 `ModelRequest` 模型（sessionId FK、provider、model）
- [ ] 5.16 定义 `UsageEvent` 模型（modelRequestId FK、inputTokens、outputTokens、totalTokens、promptCacheHitTokens? Int、promptCacheMissTokens? Int、provider、model），添加索引 `(userId, createdAt)`
- [ ] 5.17 定义 `AuditLog` 模型（eventType、payload Json）
- [ ] 5.18 定义 `ContextSummary` 模型，添加索引 `(userId, sessionId, createdAt)`
- [ ] 5.19 定义 `ContextAssemblyEvent` 模型，添加索引 `(userId, sessionId, stablePrefixHash, createdAt)`
- [ ] 5.20 定义 `JobQueue` 模型（type、payload Json、status enum、runAt、attempts Int default 0），添加索引 `(status, runAt)`

## 6. 认证实现

- [ ] 6.1 在 `src/domain/repositories/` 中定义 `IUserRepository` 接口（findByEmail、findById、create），方法签名中不含 UserScope（User 表本身是身份源）
- [ ] 6.2 在 `src/infrastructure/database/` 中实现 `UserRepository`，实现 `IUserRepository` 接口
- [ ] 6.3 写 `src/interface/plugins/auth.ts`：注册 `@fastify/jwt`，实现 `authenticate` 装饰器，JWT 验证通过后构造 `UserScope` 并挂载至 `request.userScope`，供后续路由和 application 层使用
- [ ] 6.4 写 `POST /api/auth/login` 路由：Zod 校验 body，调用 UserRepository.findByEmail，bcrypt 比对密码，成功则签发 JWT
- [ ] 6.5 写 `GET /api/auth/me` 路由（需鉴权）：从 `request.userScope` 取值，返回 `{ id, email, username }`
- [ ] 6.6 确保登录失败时统一返回 `{ "error": "Invalid credentials" }`，不区分邮箱不存在和密码错误
- [ ] 6.7 在所有其他 repository 接口定义中，将 `UserScope` 作为必填参数，实现层内部统一追加 `WHERE userId = scope.userId` 条件

## 7. 首次迁移与验证

- [ ] 7.1 执行 `prisma migrate dev --name init`，验证所有表创建成功
- [ ] 7.2 写种子脚本 `prisma/seed.ts`：创建初始管理员账号（从 env 读取 email/username/password）
- [ ] 7.3 执行 `npm run build`，验证 exit 0，无类型错误
- [ ] 7.4 执行 `npm run lint`，验证 exit 0
- [ ] 7.5 启动服务，验证 `GET /health` 返回 `{"status":"ok"}`
- [ ] 7.6 验证 `POST /api/auth/login` 返回 JWT
- [ ] 7.7 验证 `GET /api/auth/me` 用 token 返回用户信息
- [ ] 7.8 验证未知路由返回 404 JSON
- [ ] 7.9 验证缺失 `JWT_SECRET` 时服务器拒绝启动并打印错误
