## ADDED Requirements

### Requirement: ReAct 循环：思考→工具调用→观察
系统 SHALL 实现 `AgentService.run`，执行以下循环：组装上下文 → 调用模型 → 若响应含 tool_calls 则执行工具并追加结果消息 → 重复，直至模型不调用工具或达到最大循环次数。

#### Scenario: 模型直接回复不触发工具
- **WHEN** 用户发送消息，模型响应不含 tool_calls
- **THEN** 循环在第一轮结束，返回模型的文本回复

#### Scenario: 模型调用工具后继续循环
- **WHEN** 模型响应含 tool_calls，工具执行成功
- **THEN** 工具结果作为 tool 消息追加，重新调用模型，循环继续直至模型不再调用工具

#### Scenario: 达到最大循环次数时终止
- **WHEN** 循环次数达到 10（默认值）
- **THEN** 停止循环，以 `"达到最大循环次数，请重新描述你的需求"` 作为最终回复

### Requirement: ToolCall 记录持久化
系统 SHALL 在每次工具调用时将 ToolCall 写入数据库，包含 toolName、input（JSON 序列化）、output（执行结果或错误信息）。

#### Scenario: 工具执行成功时记录结果
- **WHEN** 工具执行完成
- **THEN** ToolCall 记录的 output 字段为执行结果，同时写入 `approved` 的 PermissionDecision 记录

#### Scenario: 工具执行失败时记录错误
- **WHEN** 工具执行抛出异常
- **THEN** ToolCall 记录的 output 字段为错误信息字符串，错误信息作为 tool result 消息传回模型继续循环

### Requirement: 最大循环次数可配置
系统 SHALL 支持通过环境变量 `AGENT_MAX_ITERATIONS`（默认 10）配置最大循环次数。

#### Scenario: 自定义最大循环次数生效
- **WHEN** 环境变量 `AGENT_MAX_ITERATIONS=5` 时触发一个需要多轮工具调用的任务
- **THEN** 最多执行 5 次循环后终止
