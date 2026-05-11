## 1. 配置扩展

- [x] 1.1 在 `src/config.ts` 中添加 `AGENT_MAX_ITERATIONS` 环境变量（`z.coerce.number().default(10)`）

## 2. 对话管理（ConversationService）

- [x] 2.1 创建 `src/application/services/ConversationService.ts`
- [x] 2.2 实现 `getOrCreateSession(userId, conversationId?)`: 无 conversationId 时创建 Conversation + Session，有则验证归属并创建新 Session
- [x] 2.3 实现 `appendMessage(sessionId, userId, role, content, toolCallId?)`: 写入 ConversationMessage 并更新 Conversation.lastMessageAt
- [x] 2.4 实现 `getRecentMessages(sessionId, limit)`: 按 createdAt 升序加载最近 N 条消息

## 3. 上下文组装（ContextAssembler）

- [x] 3.1 创建 `src/application/services/ContextAssembler.ts`
- [x] 3.2 实现 `assemble(sessionId, userId)`: 加载历史消息，查询最新 ContextSummary，构建消息列表
- [x] 3.3 在 system prompt 中注入 agent 角色描述、可用工具列表；若有 ContextSummary 则追加摘要
- [x] 3.4 实现 token 估算（字符数 ÷ 4）及超限检测
- [x] 3.5 实现摘要压缩：超限时调用 ModelService 生成摘要，写入 ContextSummary 和 ContextAssemblyEvent，返回压缩后消息列表（最新 10 条 + system）

## 4. 工具注册表（ToolRegistry）

- [x] 4.1 创建 `src/domain/agent/Tool.ts`，定义 `Tool` 接口（name、description、inputSchema、execute）和 `ToolContext` 类型
- [x] 4.2 创建 `src/domain/agent/ToolRegistry.ts`，实现 `register`、`get`、`toOpenAITools` 方法

## 5. 内置工具实现

- [x] 5.1 创建 `src/infrastructure/tools/MemoryReadTool.ts`，实现按 type 过滤查询 Memory
- [x] 5.2 创建 `src/infrastructure/tools/MemoryWriteTool.ts`，实现创建/更新 Memory 记录
- [x] 5.3 创建 `src/infrastructure/tools/TaskCreateTool.ts`，实现创建 Task 记录
- [x] 5.4 创建 `src/infrastructure/tools/TaskListTool.ts`，实现按 status 过滤查询 Task 列表
- [x] 5.5 创建 `src/infrastructure/tools/index.ts`，统一导出并在应用启动时注册到 ToolRegistry

## 6. Agent 循环（AgentService）

- [x] 6.1 创建 `src/application/services/AgentService.ts`
- [x] 6.2 实现 `run(userId, sessionId, userMessage)`: 完整 ReAct 循环（非流式），返回最终回复文本
- [x] 6.3 循环内：组装上下文 → 调用 ModelService.complete（含 tools 参数）→ 解析 tool_calls → 执行工具 → 写 ToolCall 和 PermissionDecision 记录 → 追加 tool 消息 → 重复
- [x] 6.4 达到 `AGENT_MAX_ITERATIONS` 时终止循环，返回预设错误提示
- [x] 6.5 实现 `stream(userId, sessionId, userMessage)`: 流式版本，返回 AsyncIterable，工具调用阶段 yield tool_call 事件，最终回复逐块 yield delta 事件

## 7. HTTP 端点

- [x] 7.1 创建 `src/interface/routes/agent.ts`，注册 `POST /api/agent/run` 路由
- [x] 7.2 使用 Zod 校验 body（`message` 非空字符串，`conversationId` 可选字符串，`stream` 布尔默认 false）
- [x] 7.3 非流式分支：调用 ConversationService.getOrCreateSession，写入 user 消息，调用 AgentService.run，写入 assistant 消息，返回 JSON
- [x] 7.4 流式分支：同上流程，调用 AgentService.stream，逐事件写入 SSE，最后发送 `{"type":"done"}` 并关闭
- [x] 7.5 处理 conversationId 归属错误（403）和 body 校验错误（400）
- [x] 7.6 在 `src/server.ts` 中注册 agent 路由，添加 JWT 鉴权前置

## 8. 验证

- [ ] 8.1 测试不含工具调用的普通对话：发送消息，确认返回回复且 ConversationMessage 记录正确
- [ ] 8.2 测试触发工具调用：发送让 agent 创建任务的消息，确认 ToolCall 记录和 Task 记录写入
- [ ] 8.3 测试流式响应：确认 SSE 事件序列（session → delta × N → done）
- [ ] 8.4 测试 conversationId 延续：第二次请求带上 conversationId，确认历史消息纳入上下文
- [ ] 8.5 测试未认证返回 401，空 message 返回 400，他人 conversationId 返回 403
