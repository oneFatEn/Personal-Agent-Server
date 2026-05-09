## ADDED Requirements

### Requirement: 邮箱密码登录
系统 SHALL 提供 `POST /api/auth/login` 端点，接受 `email` 和 `password`，验证成功后返回 JWT token。密码 SHALL 以 bcrypt（cost factor 12）哈希存储，登录时进行 bcrypt 比对。

#### Scenario: 合法凭据登录成功
- **WHEN** 以正确的 email 和 password 请求 `POST /api/auth/login`
- **THEN** 响应 SHALL 为 HTTP 200，body 含 `token`、`expiresAt`、`user: { id, email, username }`

#### Scenario: 错误密码登录失败
- **WHEN** 以正确 email 但错误 password 请求 `POST /api/auth/login`
- **THEN** 响应 SHALL 为 HTTP 401，body 含 `{ "error": "Invalid credentials" }`，不得区分邮箱不存在和密码错误（防枚举）

#### Scenario: 不存在的邮箱登录失败
- **WHEN** 以不存在的 email 请求 `POST /api/auth/login`
- **THEN** 响应 SHALL 为 HTTP 401，body 含 `{ "error": "Invalid credentials" }`

### Requirement: JWT 身份验证中间件与 UserScope 生成
系统 SHALL 提供 Fastify 插件形式的认证中间件，从 `Authorization: Bearer <token>` 头解析并验证 JWT，验证通过后构造 `UserScope`（含 `userId`、`email`、`username`）并挂载至 `request.userScope`。application 层调用 repository 时 SHALL 显式传入此 `UserScope`，repository 内部统一追加 `userId` 条件，禁止绕过。验证失败返回 HTTP 401。

#### Scenario: 合法 token 生成 UserScope
- **WHEN** 请求携带有效 JWT 访问受保护端点
- **THEN** `request.userScope` SHALL 含正确的 `userId`、`email`、`username`，端点可将其传递给 application 层

#### Scenario: 无 token 访问受保护端点
- **WHEN** 请求不携带 Authorization 头访问受保护端点
- **THEN** 响应 SHALL 为 HTTP 401，body 含 `{ "error": "Unauthorized" }`

#### Scenario: 过期 token 被拒绝
- **WHEN** 请求携带已过期 JWT
- **THEN** 响应 SHALL 为 HTTP 401

### Requirement: 当前用户查询
系统 SHALL 提供 `GET /api/auth/me` 端点（需鉴权），返回当前登录用户信息。

#### Scenario: 合法 token 返回用户信息
- **WHEN** 以有效 JWT 请求 `GET /api/auth/me`
- **THEN** 响应 SHALL 为 HTTP 200，body 含 `{ id, email, username }`
