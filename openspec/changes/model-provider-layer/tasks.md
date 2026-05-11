## 1. 依赖安装

- [x] 1.1 安装 `openai` npm 包（^4.x），用于对接 DeepSeek OpenAI-compatible API

## 2. Domain 层：接口与类型定义

- [x] 2.1 创建 `src/domain/providers/IModelProvider.ts`，定义 `Message`、`CompletionRequest`、`CompletionResponse`、`StreamChunk` 类型
- [x] 2.2 在同文件中定义 `IModelProvider` 接口，包含 `complete` 和 `stream` 两个方法签名

## 3. Infrastructure 层：DeepSeekProvider

- [x] 3.1 创建 `src/infrastructure/providers/DeepSeekProvider.ts`，实现 `IModelProvider`
- [x] 3.2 构造函数中检查 `DEEPSEEK_API_KEY`，缺失时抛出明确错误
- [x] 3.3 实现 `complete` 方法：调用 DeepSeek API 非流式接口，映射响应为 `CompletionResponse`
- [x] 3.4 实现 `stream` 方法：调用 DeepSeek API 流式接口，逐块 yield `StreamChunk`，最终 chunk 携带 usage

## 4. Application 层：ModelService

- [x] 4.1 创建 `src/application/services/ModelService.ts`
- [x] 4.2 实现 `complete` 方法：调用前创建 `ModelRequest` 记录，成功后写入 `UsageEvent`，失败时只保留 `ModelRequest` 并透传异常
- [x] 4.3 实现 `stream` 方法：调用前创建 `ModelRequest` 记录，消费完所有 chunk 后（try/finally）写入 `UsageEvent`

## 5. Interface 层：HTTP 端点

- [x] 5.1 创建 `src/interface/routes/chat.ts`，注册 `POST /api/chat/completions` 路由
- [x] 5.2 使用 Zod 校验请求 body（`messages` 非空数组、`model` 字符串有默认值、`stream` 布尔默认 false）
- [x] 5.3 非流式分支：调用 `ModelService.complete`，返回 JSON 响应
- [x] 5.4 流式分支：调用 `ModelService.stream`，设置 `Content-Type: text/event-stream`，逐块写入 SSE，最后发送 `data: [DONE]`
- [x] 5.5 在 `src/server.ts` 中注册 chat 路由，添加 JWT 鉴权前置

## 6. 验证

- [ ] 6.1 用 `curl` 或 HTTP 客户端测试非流式请求，确认返回 JSON 且 DB 有 ModelRequest / UsageEvent 记录
- [ ] 6.2 用 `curl -N` 或客户端测试流式请求，确认 SSE chunk 逐步输出并以 `[DONE]` 结束
- [x] 6.3 测试未认证请求返回 401，空 messages 返回 400
