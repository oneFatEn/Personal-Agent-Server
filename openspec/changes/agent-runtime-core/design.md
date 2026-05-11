## Context

已有基础：
- **server-foundation**：Fastify + TypeScript，四层架构，Prisma + SQLite，JWT 鉴权
- **model-provider-layer**：`IModelProvider` 接口、`DeepSeekProvider`、`ModelService`（自动记录 ModelRequest/UsageEvent）、`POST /api/chat/completions`

数据库 schema 已预定义：Conversation、Session、ConversationMessage、ToolCall、PermissionDecision、Memory、Task、Goal、ContextSummary、ContextAssemblyEvent、JobQueue。

本 change 在这两层之上构建 agent 核心，目标是可以处理一轮完整的"用户消息 → agent 思考 → （可选）工具调用 → 最终回复"循环。

## Goals / Non-Goals

**Goals:**
- 实现完整的 agentic 循环（ReAct 模式：Reason → Act → Observe）
- 对话与消息持久化（Conversation / Session / ConversationMessage）
- 可扩展的工具注册表 + 4 个内置工具
- 上下文窗口管理（截断 + 摘要触发）
- 流式 SSE 端点 `POST /api/agent/run`

**Non-Goals:**
- 并发多 agent / 多 session 同时运行
- 工具权限审批 UI（PermissionDecision 写占位，审批逻辑下一期）
- 长期记忆向量检索（本期 Memory 表用精确查找）
- 跨用户共享对话
- JobQueue 调度（表已有，本期不用）

## Decisions

### 1. ReAct 循环：单函数顺序执行，不用状态机

循环结构：
```
while (true) {
  response = await modelService.complete(messages)
  if (!response.toolCalls) break
  for each toolCall: execute → append tool result message
}
```

**替代方案**：有限状态机（idle → thinking → acting → done）。**放弃原因**：单用户个人 agent，并发极低，顺序循环更易理解和调试；状态机复杂度在此场景无收益。

### 2. Tool Registry：Map + Zod schema，运行时注册

```ts
interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  execute(input: unknown, ctx: ToolContext): Promise<string>;
}
```

工具在应用启动时注册到单例 `ToolRegistry`。输出统一为字符串（JSON 序列化），传回模型的 tool result message。

**替代方案**：文件系统扫描自动发现工具。**放弃原因**：本期工具数量少（4个），动态发现引入不必要复杂度。

### 3. 上下文组装：最新 N 条消息 + system prompt，超限触发摘要

上下文窗口策略：
1. 加载最近 50 条 ConversationMessage（可配置）
2. 若预估 token 数 > 阈值（如 6000），截断最早消息并调用模型生成摘要，写 ContextSummary
3. 若存在 ContextSummary，将其注入 system prompt 末尾

本期使用字符数估算 token（1 token ≈ 4 chars），不引入额外 tokenizer 库。

### 4. ConversationService 管理对话生命周期，AgentService 编排循环

职责分离：
- `ConversationService`：创建/延续 Conversation + Session，读写 ConversationMessage
- `AgentService`：编排上下文组装 → 模型调用 → 工具执行循环，调用 ConversationService 持久化消息

`AgentService` 不直接访问数据库，通过 `ConversationService` 和 `ModelService` 协作。

### 5. 流式端点透传模型 delta，工具调用阶段静默处理

流式响应策略：
- 模型生成最终回复时：逐块 SSE 推送 `{"type":"delta","content":"..."}`
- 工具调用执行期间：发送 `{"type":"tool_call","name":"..."}` 事件通知前端，但不 block
- 完成时：发送 `{"type":"done"}` 然后关闭流

### 6. ToolContext 携带 userId 和 sessionId，工具可访问数据库

工具执行时注入 `ToolContext`，包含 `userId`、`sessionId`、`prisma` 客户端。内置工具（memory-read/write、task-create/list）直接操作 Prisma，无需通过 Service 层。

## Risks / Trade-offs

- **无限循环**：模型反复调用工具不终止。→ 设置最大循环次数（默认 10），超出后以错误消息结束。
- **工具执行失败**：工具抛出异常。→ catch 后将错误信息序列化为 tool result 返回给模型，让模型决策如何处理。
- **上下文估算不准**：字符数估算 token 存在误差，可能超出模型上下文限制。→ 保守设置阈值（实际上下文限制的 60%），留足缓冲。
- **SQLite 写入竞争**：流式循环中多次写入 ConversationMessage。→ SQLite WAL 模式已在 server-foundation 启用，顺序写入无问题。

## Migration Plan

1. 安装无新依赖（复用 openai 包和 prisma）
2. 新增文件，不修改现有文件（除 server.ts 注册路由）
3. 无数据库迁移
4. 回滚：取消路由注册，删除新增文件

## Open Questions

- `PermissionDecision` 何时实现人工审批？→ 本期所有工具调用自动批准（写 `approved` 记录），审批 UI 留给下一期。
- Memory 检索策略：精确查找还是语义搜索？→ 本期 `memory-read` 支持按 `type` 过滤，全文语义搜索留给后期。
