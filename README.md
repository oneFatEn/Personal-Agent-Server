# Personal Agent Server

探索一个属于自己的、自进化的 agent 服务端。借鉴 Claude Code agent 架构，使用 DeepSeek API 实现模型问答。

## 技术栈

- **Runtime**: Node.js + TypeScript (ESM)
- **HTTP**: Fastify 5
- **ORM**: Prisma 7 + SQLite（可切换 PostgreSQL）
- **Auth**: JWT（@fastify/jwt）+ bcrypt
- **日志**: pino + pino-pretty

## 目录结构

```
src/
  interface/        # 路由、插件、输入校验、响应工具
  application/      # 服务编排（未来：AssistantRuntime 等）
  domain/           # 领域类型与 repository 接口
  infrastructure/   # Prisma client、repository 实现
  config.ts         # Zod 校验的环境变量
  server.ts         # Fastify 工厂函数
  main.ts           # 入口
prisma/
  schema.prisma     # 全部数据表定义
  seed.ts           # 初始管理员账号
```

## 初始化

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少填写：

```env
DATABASE_URL="file:./dev.db"
NODE_ENV="development"
JWT_SECRET="your-long-random-secret"
```

### 3. 初始化数据库

```bash
npx prisma migrate dev --name init
```

### 4. 创建管理员账号

```bash
SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_USERNAME=admin \
SEED_ADMIN_PASSWORD=your-password \
npx tsx prisma/seed.ts
```

### 5. 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

## 接口测试

所有接口返回统一结构：

```json
{ "code": 0, "message": "ok", "data": { ... } }     // 成功
{ "code": 20001, "message": "Invalid credentials", "data": null }  // 失败
```

### 健康检查

```bash
curl http://localhost:3000/health
# {"code":0,"message":"ok","data":{"status":"ok"}}
```

### 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "eyJ...",
    "expiresAt": "2026-05-17T14:00:00.000Z",
    "user": { "id": "...", "email": "admin@example.com", "username": "admin" }
  }
}
```

### 获取当前用户

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

```json
{
  "code": 0,
  "message": "ok",
  "data": { "id": "...", "email": "admin@example.com", "username": "admin" }
}
```

## 错误码

| 错误码 | HTTP 状态 | 含义              |
|--------|-----------|-------------------|
| 0      | 200       | 成功              |
| 10001  | 400       | 请求参数校验失败  |
| 20001  | 401       | 邮箱或密码错误    |
| 20002  | 401       | 未登录 / token 无效 |
| 20003  | 401       | Token 已过期      |
| 40400  | 404       | 路由或资源不存在  |
| 50000  | 500       | 服务器内部错误    |

## 其他命令

```bash
npm run typecheck   # TypeScript 类型检查
npm run lint        # ESLint 检查
npm run build       # 编译到 dist/
```
