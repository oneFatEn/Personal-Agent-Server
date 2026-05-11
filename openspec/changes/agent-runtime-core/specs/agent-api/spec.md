## ADDED Requirements

### Requirement: POST /api/agent/run 端点
系统 SHALL 注册 `POST /api/agent/run` 路由，要求 JWT 鉴权，接受 `message`（必填）、`conversationId`（可选）、`stream`（可选，默认 false）参数。

#### Scenario: 非流式请求返回完整 JSON
- **WHEN** 已认证用户发送 `POST /api/agent/run`，body 包含 `message` 且 `stream` 为 false 或缺省
- **THEN** 返回 HTTP 200，body 为 `{ conversationId, sessionId, content: string }`，content 为 agent 最终回复

#### Scenario: 流式请求返回 SSE 事件流
- **WHEN** 已认证用户发送 `POST /api/agent/run`，body 包含 `message` 且 `stream` 为 true
- **THEN** 返回 HTTP 200，`Content-Type: text/event-stream`，依次推送以下事件：
  - `data: {"type":"session","conversationId":"...","sessionId":"..."}`
  - （工具调用时）`data: {"type":"tool_call","name":"..."}`
  - `data: {"type":"delta","content":"..."}` （多次）
  - `data: {"type":"done"}`

#### Scenario: 未认证请求被拒绝
- **WHEN** 请求未携带有效 JWT
- **THEN** 返回 HTTP 401

#### Scenario: message 为空时返回 400
- **WHEN** 请求 body 中 `message` 为空字符串或缺失
- **THEN** 返回 HTTP 400，body 包含错误描述

### Requirement: conversationId 参数控制对话延续
系统 SHALL 根据请求中的 `conversationId` 决定创建新对话或延续已有对话。

#### Scenario: 不传 conversationId 时创建新对话
- **WHEN** 请求 body 不含 `conversationId`
- **THEN** 响应中返回新创建的 `conversationId` 和 `sessionId`

#### Scenario: 传入有效 conversationId 时延续对话
- **WHEN** 请求 body 包含属于当前用户的有效 `conversationId`
- **THEN** 响应中 `conversationId` 与请求一致，返回新 `sessionId`，历史消息纳入上下文

#### Scenario: 传入不属于当前用户的 conversationId 时返回 403
- **WHEN** 请求 body 包含不属于当前用户的 `conversationId`
- **THEN** 返回 HTTP 403
