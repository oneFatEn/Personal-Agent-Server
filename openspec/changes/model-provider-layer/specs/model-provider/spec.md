## ADDED Requirements

### Requirement: IModelProvider 接口定义
系统 SHALL 在 `src/domain/providers/IModelProvider.ts` 中定义 `IModelProvider` 接口，包含 `complete` 和 `stream` 两个方法，以及 `CompletionRequest`、`CompletionResponse`、`StreamChunk` 类型。

#### Scenario: complete 方法返回完整响应
- **WHEN** 调用 `provider.complete(request)` 并传入合法的 messages 数组
- **THEN** 返回包含 `content`、`model`、`usage`（inputTokens、outputTokens、totalTokens）的 `CompletionResponse`

#### Scenario: stream 方法返回 AsyncIterable
- **WHEN** 调用 `provider.stream(request)` 并传入合法的 messages 数组
- **THEN** 返回 `AsyncIterable<StreamChunk>`，每个 chunk 包含 `delta` 字符串，最后一个 chunk 包含 `usage` 字段

### Requirement: DeepSeekProvider 实现
系统 SHALL 在 `src/infrastructure/providers/DeepSeekProvider.ts` 中实现 `IModelProvider`，使用 `openai` npm 包并将 `baseURL` 指向 DeepSeek API endpoint。

#### Scenario: 构造时 API key 缺失抛出错误
- **WHEN** 实例化 `DeepSeekProvider` 时 `DEEPSEEK_API_KEY` 未配置
- **THEN** 抛出包含明确错误信息的异常，而非在首次调用时静默失败

#### Scenario: complete 调用 DeepSeek API
- **WHEN** 调用 `DeepSeekProvider.complete` 并传入 `model` 和 `messages`
- **THEN** 向 DeepSeek API 发送非流式请求，并将响应映射为 `CompletionResponse`

#### Scenario: stream 调用 DeepSeek API 并逐块输出
- **WHEN** 调用 `DeepSeekProvider.stream` 并传入 `model` 和 `messages`
- **THEN** 向 DeepSeek API 发送流式请求，逐块 yield `StreamChunk`，完成后 yield 含 usage 的最终 chunk
