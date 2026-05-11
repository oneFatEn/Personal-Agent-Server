## ADDED Requirements

### Requirement: 创建或延续对话
系统 SHALL 提供 `ConversationService`，支持创建新 Conversation（及关联 Session），或通过 `conversationId` 延续已有对话（创建新 Session）。

#### Scenario: 新对话时创建 Conversation 和 Session
- **WHEN** 调用 `ConversationService.getOrCreateSession` 且未传入 `conversationId`
- **THEN** 创建新 Conversation 记录和关联的 Session 记录，返回两者的 id

#### Scenario: 延续已有对话时创建新 Session
- **WHEN** 调用 `ConversationService.getOrCreateSession` 并传入有效 `conversationId`
- **THEN** 复用已有 Conversation，创建新 Session 记录，返回 conversationId 和新 sessionId

#### Scenario: 传入不属于当前用户的 conversationId 时返回错误
- **WHEN** 传入的 `conversationId` 存在但属于其他用户
- **THEN** 抛出权限错误，不创建任何记录

### Requirement: 持久化对话消息
系统 SHALL 将每轮消息（user、assistant、tool、system）持久化为 ConversationMessage 记录，role 字段与 MessageRole 枚举一致。

#### Scenario: 用户消息写入数据库
- **WHEN** agent 收到用户输入并开始处理
- **THEN** 在处理开始前将 `role=user` 的 ConversationMessage 写入数据库

#### Scenario: assistant 回复写入数据库
- **WHEN** agent 产生最终回复
- **THEN** 将 `role=assistant` 的 ConversationMessage 写入数据库，content 为完整回复文本

#### Scenario: 工具结果写入数据库
- **WHEN** 工具执行完成
- **THEN** 将 `role=tool` 的 ConversationMessage 写入数据库，toolCallId 与对应 ToolCall 记录关联

### Requirement: 更新对话最后活跃时间
系统 SHALL 在每次写入新消息后更新 Conversation 的 `lastMessageAt` 字段。

#### Scenario: 新消息后 lastMessageAt 更新
- **WHEN** 新 ConversationMessage 写入成功
- **THEN** 对应 Conversation 的 `lastMessageAt` 更新为当前时间
