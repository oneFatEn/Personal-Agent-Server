## ADDED Requirements

### Requirement: Zod 校验的环境配置
应用 SHALL 在 `src/config.ts` 通过 Zod schema 校验所有环境变量，导出单一类型安全的 `config` 对象。除 `src/config.ts` 外，任何文件 SHALL NOT 直接访问 `process.env`。

#### Scenario: 缺失必填变量导致启动失败
- **WHEN** `DATABASE_URL` 等必填变量缺失时启动服务
- **THEN** 进程 SHALL 以非零 exit code 退出，并输出明确说明缺失变量的错误信息，且在任何 TCP 端口绑定之前退出

#### Scenario: 合法环境产出类型安全 config
- **WHEN** 所有必填环境变量存在且合法
- **THEN** `config` SHALL 可作为完整类型化的 TypeScript 对象导入，必填字段无 `undefined`

### Requirement: 必填环境变量
以下变量 SHALL 在 Zod schema 中标记为必填：`DATABASE_URL`、`NODE_ENV`（枚举：`development` | `test` | `production`）、`JWT_SECRET`。

#### Scenario: 缺少 JWT_SECRET 时启动失败
- **WHEN** `JWT_SECRET` 未设置
- **THEN** 进程 SHALL 以非零 exit code 退出并报告缺失变量

### Requirement: 可选环境变量含默认值
以下变量 SHALL 为可选并含文档化默认值：`PORT`（默认 3000）、`LOG_LEVEL`（默认 `info`）、`JWT_EXPIRES_IN`（默认 `7d`）、`DEEPSEEK_API_KEY`（可选字符串）、`FIELD_ENCRYPTION_KEY`（可选字符串）。

#### Scenario: 未设置 PORT 时使用默认值
- **WHEN** `PORT` 未在环境中设置
- **THEN** 服务器 SHALL 绑定至 3000 端口
