## Why

server-foundation 已建立可运行的服务器骨架与数据库 schema（含 ModelRequest、UsageEvent 表）。下一步需要实现 model-provider-layer，为 agent runtime 提供统一的模型调用接口——屏蔽底层 API 差异、记录每次请求与 token 用量，并支持流式输出。

## What Changes

- 在 domain 层定义 `IModelProvider` 接口与相关类型（Message、CompletionRequest、CompletionResponse、StreamChunk）
- 在 infrastructure 层实现 `DeepSeekProvider`，对接 DeepSeek OpenAI-compatible API，支持普通与流式两种模式
- 在 application 层实现 `ModelService`，封装调用逻辑并自动写入 ModelRequest / UsageEvent 记录
- 将 `DEEPSEEK_API_KEY` 从 optional 改为 required（在 provider 初始化时校验，而非启动时）
- 暴露 `POST /api/chat/completions` HTTP 端点，支持流式 SSE 响应

## Capabilities

### New Capabilities

- `model-provider`: IModelProvider 接口、DeepSeekProvider 实现、支持普通与流式调用
- `model-usage-tracking`: ModelService 自动记录 ModelRequest 与 UsageEvent 到数据库
- `chat-completions-api`: `POST /api/chat/completions` 端点，JWT 鉴权，支持 stream 参数

### Modified Capabilities

## Impact

- 新增 `src/domain/providers/`、`src/infrastructure/providers/`、`src/application/services/ModelService.ts`、`src/interface/routes/chat.ts`
- 依赖已有的 Prisma ModelRequest / UsageEvent schema，无需新增迁移
- 不修改现有 auth、config、server 代码（除注册新路由外）
