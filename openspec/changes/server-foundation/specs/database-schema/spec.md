## ADDED Requirements

### Requirement: 全量核心表定义
Prisma schema SHALL 定义以下所有模型：`User`、`Conversation`、`Session`、`ConversationMessage`、`Goal`、`Plan`、`Task`、`Reminder`、`Memory`、`ToolCall`、`PermissionDecision`、`Notification`、`ChannelBinding`、`ModelRequest`、`UsageEvent`、`AuditLog`、`ContextSummary`、`ContextAssemblyEvent`、`JobQueue`。

#### Scenario: 首次迁移无错误
- **WHEN** 执行 `prisma migrate dev --name init`
- **THEN** 以 exit 0 退出，所有表 SHALL 在数据库中存在

### Requirement: ConversationMessage 支持全部消息角色
`ConversationMessage` 模型 SHALL 包含 `role` 字段（枚举：`user` | `assistant` | `tool` | `system`）、`content`、`reasoningContent`（nullable）、`toolCalls`（JSON nullable，存储 assistant 消息的工具调用数组）、`toolCallId`（nullable，role=tool 时对应 assistant 消息的 tool_call_id）。

#### Scenario: tool 角色消息可存储 toolCallId
- **WHEN** 插入一条 role=tool 的 ConversationMessage
- **THEN** `toolCallId` 字段 SHALL 成功存储对应的 tool_call_id 字符串

### Requirement: userId 外键覆盖所有核心表
除 `User` 外，所有核心表 SHALL 含非空 `userId` 外键引用 `User.id`，并设置级联删除。

#### Scenario: 跨用户插入被数据库拒绝
- **WHEN** 插入一条 `userId` 不存在于 `User` 表的记录
- **THEN** 数据库 SHALL 以外键约束错误拒绝该操作

### Requirement: 关键查询索引
Schema SHALL 定义以下索引：`Session(userId, updatedAt)`、`Goal(userId, status)`、`Task(userId, status, dueAt)`、`Reminder(userId, status, remindAt)`、`Memory(userId, type)`、`UsageEvent(userId, createdAt)`、`ToolCall(userId, toolName, createdAt)`、`ContextSummary(userId, sessionId, createdAt)`、`ContextAssemblyEvent(userId, sessionId, stablePrefixHash, createdAt)`、`JobQueue(status, runAt)`。

#### Scenario: 索引在 schema 中存在
- **WHEN** 检查 Prisma schema 文件
- **THEN** 每条索引 SHALL 以 `@@index` 指令出现在对应模型中

### Requirement: UsageEvent 存储 DeepSeek cache 指标
`UsageEvent` 模型 SHALL 包含 `promptCacheHitTokens`（Int nullable）和 `promptCacheMissTokens`（Int nullable）字段。

#### Scenario: cache hit tokens 可存储
- **WHEN** 插入含 promptCacheHitTokens 的 UsageEvent
- **THEN** 值 SHALL 被完整存储，不截断

### Requirement: JobQueue 表支持后台任务调度
`JobQueue` 模型 SHALL 包含 `id`、`type`、`payload`（JSON）、`status`（枚举：`pending` | `running` | `done` | `failed`）、`runAt`、`attempts`（Int，默认 0）、`createdAt`、`updatedAt`。

#### Scenario: pending 任务可按 runAt 查询
- **WHEN** 查询 `status=pending AND runAt <= now()` 的 JobQueue 记录
- **THEN** 结果 SHALL 仅包含已到期的待执行任务
