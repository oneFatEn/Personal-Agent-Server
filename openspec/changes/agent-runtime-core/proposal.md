## Why

model-provider-layer 已实现统一的模型调用接口。现在需要在其之上构建 agent-runtime-core——实现"思考→工具调用→观察"的核心循环，让服务器从一个普通聊天 API 升级为真正能自主行动的个人 agent。

## What Changes

- 实现对话管理：创建/延续 Conversation 与 Session，将每轮消息持久化为 ConversationMessage 记录
- 实现上下文组装：从数据库中加载历史消息，注入 system prompt，管理上下文窗口（超限时触发摘要压缩）
- 实现 Tool Registry：工具注册表，统一工具定义（name、描述、Zod schema）与执行入口
- 实现内置工具集：`memory-read`、`memory-write`、`task-create`、`task-list`（覆盖 Memory / Task 表）
- 实现 Agent Loop：解析模型响应中的 tool_calls，执行工具，将结果追加为 tool 消息，循环直至模型不再调用工具
- 记录 ToolCall（含 PermissionDecision 占位）与 ContextAssemblyEvent
- 暴露 `POST /api/agent/run` 端点（JWT 鉴权，支持流式 SSE）

## Capabilities

### New Capabilities

- `conversation-management`: 创建/延续 Conversation 与 Session，持久化 ConversationMessage
- `context-assembly`: 加载历史消息、注入 system prompt、上下文窗口截断与摘要压缩触发
- `tool-registry`: 工具注册表接口与内置工具（memory-read、memory-write、task-create、task-list）
- `agent-loop`: think→tool-call→observe 核心循环，记录 ToolCall，循环终止条件
- `agent-api`: `POST /api/agent/run` 端点，支持普通与流式响应，接受 conversationId（可选）

### Modified Capabilities

## Impact

- 新增 `src/domain/agent/`、`src/application/services/AgentService.ts`、`src/application/services/ConversationService.ts`、`src/infrastructure/tools/`、`src/interface/routes/agent.ts`
- 依赖 model-provider-layer 的 `ModelService`（已实现）
- 复用已有 Prisma schema 中的 Conversation、Session、ConversationMessage、ToolCall、Memory、Task、ContextSummary、ContextAssemblyEvent 表，无需新增迁移
- 不修改 auth、model-provider 现有代码（除注册新路由外）
