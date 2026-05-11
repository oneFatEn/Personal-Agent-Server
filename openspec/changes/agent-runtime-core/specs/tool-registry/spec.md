## ADDED Requirements

### Requirement: 工具注册与查找
系统 SHALL 提供 `ToolRegistry` 单例，支持在启动时注册工具，并在 agent 循环中按名称查找工具。

#### Scenario: 注册并查找工具
- **WHEN** 调用 `ToolRegistry.register(tool)` 注册工具后调用 `ToolRegistry.get(name)`
- **THEN** 返回已注册的工具实例

#### Scenario: 查找未注册工具时抛出错误
- **WHEN** 调用 `ToolRegistry.get` 传入未注册的工具名
- **THEN** 抛出包含工具名的明确错误信息

#### Scenario: 获取所有工具的 OpenAI function calling 格式描述
- **WHEN** 调用 `ToolRegistry.toOpenAITools()`
- **THEN** 返回符合 OpenAI function calling 格式的工具描述数组，包含 name、description、parameters（来自 Zod schema）

### Requirement: 内置工具 memory-read
系统 SHALL 提供 `memory-read` 工具，按 `type` 过滤查询当前用户的 Memory 记录，返回 JSON 字符串。

#### Scenario: 按 type 查询 Memory
- **WHEN** agent 调用 `memory-read` 并传入 `{ type: "preference" }`
- **THEN** 返回该用户所有 `type=preference` 的 Memory 记录列表（JSON 字符串）

### Requirement: 内置工具 memory-write
系统 SHALL 提供 `memory-write` 工具，创建或更新当前用户的 Memory 记录（按 type + content 唯一，重复则覆盖）。

#### Scenario: 写入新 Memory
- **WHEN** agent 调用 `memory-write` 并传入 `{ type: "fact", content: "用户喜欢简洁的回复" }`
- **THEN** 数据库中创建对应 Memory 记录，返回成功确认字符串

### Requirement: 内置工具 task-create
系统 SHALL 提供 `task-create` 工具，为当前用户创建 Task 记录。

#### Scenario: 创建新任务
- **WHEN** agent 调用 `task-create` 并传入 `{ title: "读完这本书", dueAt: "2026-05-20" }`
- **THEN** 数据库中创建 Task 记录，status 默认 `pending`，返回任务 id 和标题

### Requirement: 内置工具 task-list
系统 SHALL 提供 `task-list` 工具，查询当前用户的 Task 列表，支持按 `status` 过滤。

#### Scenario: 查询待办任务
- **WHEN** agent 调用 `task-list` 并传入 `{ status: "pending" }`
- **THEN** 返回该用户所有 `status=pending` 的 Task 记录列表（JSON 字符串）
