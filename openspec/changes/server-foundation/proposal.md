## Why

目前仓库没有任何源代码。在 agent runtime、模型接入、通知渠道等功能落地之前，必须先有一个可运行的服务器骨架——包含 HTTP 服务、SQLite 数据库连接、完整表结构迁移、类型安全配置和结构化日志。所有后续 change 都依赖这个基础。

## What Changes

- 初始化 Node.js + TypeScript 项目，使用 Fastify 作为 HTTP 框架
- 建立四层目录结构：interface / application / domain / infrastructure
- 配置 Prisma + SQLite，定义所有核心表结构并运行首次迁移
- 实现 Zod 校验的类型安全环境配置，缺失必填变量时启动即报错退出
- 集成 pino 结构化日志
- 实现邮箱+密码登录，签发 JWT，提供 `GET /api/auth/me` 验证端点
- 注册 `GET /health` 健康检查端点
- 实现 SIGTERM 优雅关闭

## Capabilities

### New Capabilities

- `project-scaffold`: TypeScript + Fastify 项目结构、构建工具链、lint、四层目录布局
- `database-schema`: Prisma schema 涵盖所有核心域表，含 user_id 外键、关键索引、job_queue 表
- `typed-config`: Zod 校验的环境变量配置，启动时快速失败
- `http-server`: Fastify 服务器工厂、健康检查、pino 日志、统一错误响应、优雅关闭
- `user-auth`: 邮箱+密码登录、bcrypt 哈希、JWT 签发与验证、AuthContext 中间件

### Modified Capabilities

## Impact

- 从零创建 `src/` 源码树及所有配置文件
- 引入 `package.json`、`tsconfig.json`、`prisma/schema.prisma`、`.env.example`
- 后续三个 change（model-provider-layer、agent-runtime-core、channels-and-notif）全部依赖此基础
- 绿地项目，无 breaking change
