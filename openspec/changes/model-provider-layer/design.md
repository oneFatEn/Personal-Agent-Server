## Context

server-foundation 已实现：Fastify HTTP 服务、Prisma + SQLite、JWT 鉴权、四层目录结构（interface / application / domain / infrastructure）。数据库 schema 已包含 ModelRequest 和 UsageEvent 表。config.ts 中 `DEEPSEEK_API_KEY` 目前为 optional。

本 change 在此基础上构建模型调用层，目标是让 agent runtime（下一个 change）可以通过一个稳定接口调用模型，而无需关心底层 API 细节。

## Goals / Non-Goals

**Goals:**
- 定义 `IModelProvider` 接口，统一模型调用签名（普通 + 流式）
- 实现 `DeepSeekProvider`，对接 DeepSeek OpenAI-compatible API
- 实现 `ModelService`，封装调用并自动持久化 ModelRequest / UsageEvent
- 暴露 `POST /api/chat/completions` 端点（JWT 鉴权，支持 `stream` 参数）

**Non-Goals:**
- 多 provider 动态切换（本期只实现 DeepSeek）
- 对话历史管理（属于 agent-runtime-core）
- Function calling / tool use 支持（下一期）
- 计费限额与限流（下一期）

## Decisions

### 1. 使用 OpenAI SDK 对接 DeepSeek

DeepSeek 提供 OpenAI-compatible API。使用官方 `openai` npm 包，通过 `baseURL` 切换到 DeepSeek endpoint，省去手写 HTTP 客户端。

**替代方案**：手写 `fetch` 调用。**放弃原因**：需要自行处理 SSE 解析、重试逻辑、类型定义，引入 `openai` 包更简洁且后续扩展其他 provider 成本低。

### 2. IModelProvider 接口设计：两个方法

```ts
interface IModelProvider {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  stream(req: CompletionRequest): AsyncIterable<StreamChunk>;
}
```

普通和流式分为两个方法，而非通过 `stream` flag 决定返回类型——使类型系统更清晰，调用方无需 narrowing。

### 3. ModelService 负责持久化，Provider 不知道数据库

Provider 只做 API 调用，ModelService 在调用前创建 ModelRequest 记录，调用后（或流结束后）写入 UsageEvent。职责分离，Provider 可独立测试。

### 4. 流式端点使用 SSE（text/event-stream）

HTTP 端点流式响应使用标准 SSE 格式（`data: {...}\n\n`），与 OpenAI API 格式兼容，前端可直接使用 `EventSource` 或 `fetch` + ReadableStream 消费。

### 5. DEEPSEEK_API_KEY 在 Provider 构造时校验，而非启动时

保持 config.ts 中为 optional，在 `DeepSeekProvider` 构造时若 key 缺失则抛出明确错误。这样服务器可以在没有 API key 的情况下启动（用于本地开发 / 其他功能），只有调用模型时才报错。

## Risks / Trade-offs

- **SQLite 并发写入**：流式请求结束时写 UsageEvent，若请求被中途取消则可能漏记。→ 使用 `try/finally` 确保即使流中断也尝试写入（token 数以已接收为准）。
- **DeepSeek API 不稳定**：外部依赖，无 SLA 保证。→ 本期不做重试，错误直接透传给调用方；重试逻辑留给 agent-runtime-core 的编排层处理。
- **openai 包版本**：需锁定 v4.x，v5 API 有 breaking change。→ package.json 中固定 `"openai": "^4.x"`。

## Migration Plan

1. 安装 `openai` npm 包
2. 新增文件（不修改现有文件，除 server.ts 注册新路由）
3. 在 `.env` 中添加 `DEEPSEEK_API_KEY`
4. 无数据库迁移（复用现有 schema）
5. 回滚：删除新增文件，取消路由注册即可

## Open Questions

- 是否需要在 ModelRequest 记录中存储完整 messages（用于调试）？当前 schema 没有 messages 字段。→ 本期暂不存储，留给 agent-runtime-core 的 Conversation / ConversationMessage 表处理。
