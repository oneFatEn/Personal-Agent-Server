## ADDED Requirements

### Requirement: ModelService 封装调用并持久化记录
系统 SHALL 在 `src/application/services/ModelService.ts` 中实现 `ModelService`，在每次模型调用前创建 `ModelRequest` 记录，调用完成后创建 `UsageEvent` 记录。

#### Scenario: 普通调用成功后写入 UsageEvent
- **WHEN** 调用 `ModelService.complete` 并成功获得响应
- **THEN** 数据库中存在对应的 `ModelRequest` 记录和 `UsageEvent` 记录，token 数与响应 usage 一致

#### Scenario: 流式调用结束后写入 UsageEvent
- **WHEN** 调用 `ModelService.stream` 且调用方消费完所有 chunk
- **THEN** 数据库中存在对应的 `ModelRequest` 记录和 `UsageEvent` 记录，token 数来自最终 chunk 的 usage

#### Scenario: 调用失败时仍创建 ModelRequest 记录
- **WHEN** `ModelService.complete` 调用 Provider 时抛出异常
- **THEN** `ModelRequest` 记录已创建（便于调试），UsageEvent 不创建，异常向上透传

### Requirement: ModelRequest 关联 sessionId 和 userId
`ModelRequest` 记录 SHALL 包含合法的 `sessionId` 和 `userId`，与现有 Session / User 表外键约束一致。

#### Scenario: 创建 ModelRequest 时携带 userId
- **WHEN** `ModelService` 创建 `ModelRequest` 记录
- **THEN** 记录中的 `userId` 与当前认证用户的 id 一致
