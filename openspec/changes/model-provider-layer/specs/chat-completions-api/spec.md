## ADDED Requirements

### Requirement: POST /api/chat/completions 端点
系统 SHALL 在 `src/interface/routes/chat.ts` 中注册 `POST /api/chat/completions` 路由，要求 JWT 鉴权，接受 `messages`、`model`、`stream` 参数。

#### Scenario: 非流式请求返回 JSON
- **WHEN** 已认证用户发送 `POST /api/chat/completions`，body 包含 `messages` 数组且 `stream` 为 `false` 或缺省
- **THEN** 返回 HTTP 200，body 为 `{ content: string, model: string, usage: { inputTokens, outputTokens, totalTokens } }`

#### Scenario: 流式请求返回 SSE
- **WHEN** 已认证用户发送 `POST /api/chat/completions`，body 包含 `messages` 数组且 `stream` 为 `true`
- **THEN** 返回 HTTP 200，`Content-Type: text/event-stream`，逐块输出 `data: {"delta":"..."}` 格式，最后输出 `data: [DONE]`

#### Scenario: 未认证请求被拒绝
- **WHEN** 请求未携带有效 JWT
- **THEN** 返回 HTTP 401

#### Scenario: messages 为空时返回 400
- **WHEN** 已认证用户发送请求但 `messages` 为空数组或缺失
- **THEN** 返回 HTTP 400，body 包含错误描述

### Requirement: 请求 body 使用 Zod 校验
系统 SHALL 对请求 body 进行 Zod schema 校验，包括：`messages` 为非空数组（每项含 `role` 和 `content`），`model` 为字符串（有默认值），`stream` 为布尔（默认 false）。

#### Scenario: 无效 role 值返回 400
- **WHEN** messages 中某项的 `role` 不在 `["user", "assistant", "system"]` 内
- **THEN** 返回 HTTP 400，body 包含字段级错误信息
