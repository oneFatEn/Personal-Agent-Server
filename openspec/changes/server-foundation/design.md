## Context

绿地项目，无任何现有源码。部署环境为开发者个人 Mac（未来为常开 Mac mini）+ frp 内网穿透，用户规模 2～5 人，并发极低。开发者在公司和家里两台机器之间通过 git 同步代码，各自使用独立的本地 SQLite dev 数据库。

## Goals / Non-Goals

**Goals:**
- 产出一个可运行的 Fastify 服务，有健康检查端点
- 建立四层目录结构（interface / application / domain / infrastructure）
- 定义全部核心表的 Prisma schema 并完成首次迁移
- 实现 Zod 校验的类型安全配置，缺失必填变量时启动即退出
- 集成 pino 结构化日志
- 实现邮箱+密码登录、JWT 鉴权、AuthContext 中间件

**Non-Goals:**
- 注册页面（MVP 账号手动创建）
- 模型接入（model-provider-layer）
- Agent 逻辑（agent-runtime-core）
- 通知渠道（channels-and-notif）
- Redis、BullMQ、多租户 workspace

## Decisions

### Fastify 而非 NestJS
Fastify 框架耦合低，手动构造函数注入保持 DI 显式可见。NestJS 的装饰器 DI 会模糊层间边界。

### Prisma + SQLite，provider 可切换
SQLite 单文件零运维，WAL 模式满足低并发需求。Prisma 支持 provider 切换（改一行 + 重新迁移），迁移兼容性约束：业务层不直接查询 JSON 字段内部，只做整体读写。

### 目录结构
```
src/
  interface/       # 路由、SSE、webhook、输入校验
  application/     # 服务编排：AssistantRuntime、ConversationService 等
  domain/          # 纯领域模型与接口，零框架依赖
  infrastructure/  # DB repositories、外部客户端实现
  config.ts        # Zod 校验的 env config
  server.ts        # Fastify 工厂函数
  main.ts          # 入口
prisma/
  schema.prisma
```

### JWT 无状态认证
MVP 账号由管理员手动创建，只需登录端点。JWT 有效期通过 `JWT_EXPIRES_IN` 配置（默认 7d）。客户端通过 `Authorization: Bearer <token>` 传递。登出由客户端丢弃 token 实现，服务端无状态。

### bcrypt 密码哈希
cost factor 默认 12，在个人 Mac 上单次哈希约 200ms，安全与性能均可接受。

### 所有表含 userId 外键
interface 层完成认证后生成应用层 `AuthContext` / `UserScope`；application 调用 repository 时必须显式传入 `userId` / `UserScope`，repository 内部统一追加 `userId` 条件，禁止业务流程绕过数据隔离。

## Risks / Trade-offs

- **SQLite 串行写入** → 低并发场景无影响；并发写入激增时切换 PostgreSQL
- **JWT 无法主动吊销** → 个人小圈子场景可接受；需要吊销时引入 token 黑名单表
- **手动创建账号** → 增加初始配置成本，但完全避免注册安全问题

## Migration Plan

1. `npm init` → 安装依赖
2. 配置 `tsconfig.json`、ESLint、Prettier
3. 写 `src/config.ts`（Zod schema）
4. 写 `src/server.ts` Fastify 工厂 + health route
5. 写 `src/main.ts` 入口
6. 写 `prisma/schema.prisma`（全部表）
7. `prisma migrate dev --name init`
8. 实现 `POST /api/auth/login`、`GET /api/auth/me`
9. 验证：服务启动、`/health` 200、登录返回 JWT、`/api/auth/me` 验证通过

Rollback：绿地项目，无需回滚策略。

## Open Questions

无。所有技术选型已在 explore 阶段确认。
