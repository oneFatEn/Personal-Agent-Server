## ADDED Requirements

### Requirement: Fastify 服务器工厂
`src/server.ts` SHALL 导出 `buildServer()` 异步函数，创建并配置 Fastify 实例（含 pino 日志）。`src/main.ts` SHALL 调用 `buildServer()` 并绑定至配置的端口。

#### Scenario: 服务器启动并接受连接
- **WHEN** 以合法环境变量执行 `npm run dev` 或 `npm start`
- **THEN** 进程 SHALL 输出启动日志，服务器 SHALL 在配置端口接受 TCP 连接

#### Scenario: SIGTERM 触发优雅关闭
- **WHEN** 进程收到 SIGTERM 信号
- **THEN** 服务器 SHALL 停止接受新连接，等待现有连接处理完毕后以 exit 0 退出

### Requirement: 健康检查端点
服务器 SHALL 提供 `GET /health`，返回 HTTP 200 和 JSON body `{ "status": "ok" }`，无需认证。

#### Scenario: 健康检查返回 200
- **WHEN** 请求 `GET /health`
- **THEN** 响应 SHALL 为 HTTP 200，Content-Type: application/json，body 为 `{"status":"ok"}`

### Requirement: pino 结构化 JSON 日志
所有日志 SHALL 通过 pino 以换行分隔的 JSON 格式输出，日志级别通过 `LOG_LEVEL` 配置。development 环境可使用 pino-pretty 美化输出。

#### Scenario: 请求日志含关键字段
- **WHEN** 任意 HTTP 请求被处理
- **THEN** pino SHALL 输出含 method、url、statusCode、responseTime 的日志行

### Requirement: 统一 JSON 错误响应
未匹配路由 SHALL 返回 HTTP 404，body 为 `{ "error": "Not Found" }`。未处理异常 SHALL 返回 HTTP 500，body 为 `{ "error": "Internal Server Error" }`，production 环境不泄露 stack trace。

#### Scenario: 未知路由返回 404 JSON
- **WHEN** 请求未定义的路由
- **THEN** 响应 SHALL 为 HTTP 404，Content-Type: application/json

#### Scenario: production 环境未处理异常返回 500 JSON
- **WHEN** 路由处理函数抛出未预期错误且 NODE_ENV=production
- **THEN** 响应 SHALL 为 HTTP 500，body 中 SHALL NOT 包含 stack trace
