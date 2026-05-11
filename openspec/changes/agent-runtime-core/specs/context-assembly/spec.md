## ADDED Requirements

### Requirement: 加载历史消息构建上下文
系统 SHALL 从数据库加载当前 Session 最近 N 条 ConversationMessage（N 默认 50，可配置），按 `createdAt` 升序排列，映射为模型 Message 格式。

#### Scenario: 正常加载历史消息
- **WHEN** Session 有 30 条历史消息
- **THEN** 上下文包含全部 30 条消息，顺序与写入顺序一致

#### Scenario: 消息数超过限制时截断最早消息
- **WHEN** Session 有超过 50 条历史消息
- **THEN** 只加载最新 50 条消息，最早的消息被丢弃

### Requirement: 注入 system prompt
系统 SHALL 在消息列表最前面插入固定 system prompt，描述 agent 的角色、可用工具列表和行为规范。若存在 ContextSummary，SHALL 将摘要内容追加到 system prompt 末尾。

#### Scenario: 首次对话注入基础 system prompt
- **WHEN** Session 无历史 ContextSummary
- **THEN** 消息列表第一条为 `role=system`，包含 agent 角色描述和工具列表

#### Scenario: 存在摘要时注入摘要到 system prompt
- **WHEN** 该 Session 有最新一条 ContextSummary 记录
- **THEN** system prompt 末尾追加摘要内容，格式为 `\n\n## 对话摘要\n{content}`

### Requirement: 上下文超限时触发摘要压缩
系统 SHALL 估算上下文 token 数（字符数 ÷ 4），若超过阈值（默认 6000 token）则调用模型生成摘要，写入 ContextSummary 记录，并记录 ContextAssemblyEvent。

#### Scenario: 上下文未超限时不触发压缩
- **WHEN** 估算 token 数 ≤ 6000
- **THEN** 直接返回完整消息列表，不调用模型，不写 ContextSummary

#### Scenario: 上下文超限时生成摘要
- **WHEN** 估算 token 数 > 6000
- **THEN** 调用模型生成对话摘要，将摘要写入 ContextSummary，写入 ContextAssemblyEvent，返回压缩后的消息列表（仅保留最新 10 条 + system prompt）
