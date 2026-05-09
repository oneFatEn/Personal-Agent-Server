## ADDED Requirements

### Requirement: 四层目录结构
项目 SHALL 遵循 interface / application / domain / infrastructure 四层目录结构。domain 层 SHALL 对 Fastify、Prisma 等框架零依赖。application 层 SHALL 只通过 domain 层定义的 repository 接口访问数据库。

#### Scenario: domain 层无框架依赖
- **WHEN** 检查 `src/domain/` 下任意文件的 import
- **THEN** SHALL NOT 出现 `fastify`、`@prisma/client` 等框架包的直接引用

#### Scenario: application 层通过接口访问数据库
- **WHEN** application 层需要查询数据库
- **THEN** SHALL 调用 domain 层定义的 repository 接口，由 infrastructure 层提供实现

### Requirement: TypeScript 严格模式构建
项目 SHALL 以 `strict: true` 编译 TypeScript，`build` 脚本产出 `dist/` 可运行 JavaScript，`dev` 脚本支持热重载无需手动编译。

#### Scenario: 严格构建通过
- **WHEN** 执行 `npm run build`
- **THEN** 以 exit 0 退出，无任何类型错误

#### Scenario: dev 模式无需预编译
- **WHEN** 执行 `npm run dev`
- **THEN** 服务器 SHALL 直接启动并可接受请求，无需额外编译步骤

### Requirement: Lint 与格式化
项目 SHALL 包含 ESLint（TypeScript 规则）和 Prettier，`lint` 脚本在任何 lint 错误时以非零 exit code 退出。

#### Scenario: 初始脚手架 lint 通过
- **WHEN** 执行 `npm run lint`
- **THEN** 以 exit 0 退出

### Requirement: .env.example 文档化所有环境变量
项目根目录 SHALL 包含 `.env.example`，列出所有环境变量及说明。`.env` SHALL 被 `.gitignore` 排除，不得提交到版本库。

#### Scenario: .env 不在版本库中
- **WHEN** 执行 `git status` 或 `git ls-files`
- **THEN** `.env` SHALL NOT 出现在追踪文件列表中
