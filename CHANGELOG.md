# 更新日志

本文档记录 E-Vote 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中

- 前端性能优化（代码分割 + 懒加载）
- ECharts 按需加载
- TypeScript 迁移评估

### 变更

- 投票记录拆分为 `vote_submissions`（一人一票）和 `vote_choices`（多选明细），新增 `sql/migrations/001_vote_submissions.sql` 迁移旧 `votes` 表
- 参与人数改为统计提交记录，多选投票不再按行数重复计数

### 安全

- 将 Node.js 支持范围收紧至 **22.23.4+ / 24.22.1+**：Node 18/20 已 EOL，且不含 eMudhra 中间 CA 私钥事件的修复，旧运行时仍可能信任可被还原的证书链
- CI 矩阵由 Node.js 18.x / 20.x 调整为 **22.x / 24.x**
- 前端统一转义用户输入，修复投票标题/说明/选项名/图表 tooltip/选项属性中的存储型 XSS
- 移除全局 `trust proxy=true`，只有显式配置 `TRUST_PROXY` 才信任代理头；新增 `CORS_ORIGIN` 白名单
- CSV 导出改用安全文件名和唯一临时文件，修复标题路径穿越；对公式前缀做转义
- 启动日志不再打印默认管理员密码；Redis 连接失败日志按分钟限频
- Docker Compose 的 MySQL / Redis 端口仅绑定 `127.0.0.1`，避免本地开发服务暴露到局域网
- Docker Compose 只挂载 `sql/init.sql` 作为初始化脚本，避免本地 `init.local.sql` 的旧表结构被意外执行
- CSP 移除 `unsafe-inline`，内联事件改为事件委托，内联样式移入 `style.css`
- 认证中间件每次请求回查数据库用户/角色，token 里的旧角色不再继续生效
- 草稿投票不再出现在公开列表/详情/结果/导出中，仅创建者或管理员可见
- 升级 express 到 `^4.22.3` 并补充 redis `^6.3.0`；`npm audit --omit=dev` 生产依赖漏洞为 0

### 修复

- 修复多选投票第二条 INSERT 触发 `uk_user_poll` 唯一键、整笔投票回滚的问题
- 修复 AI 接口收到非字符串 `topic` 时 `.trim()` 抛错导致进程退出的问题
- 投票提交增加截止时间校验，过期投票不再能投
- 投票结果接口在 Redis 不可用时降级查询数据库，不再返回 500
- 结果页保留标题/类型/最大可选数，修复标题停留在“加载中...”
- 更新投票改为按字段合并，避免未传字段被清空；相同值更新不再误报 404
- 补全标题/选项/截止时间/分页校验；登录时不再 trim 密码
- Docker MySQL 显式使用 +08:00 时区，默认截止时间使用本地时间
- 补充缺失的 `redis` 依赖声明，避免全新安装或 CI 出现 `Cannot find module 'redis'`
- 修复全新数据库初始化后默认管理员无法登录的问题

### 文档

- README 覆盖率按重构后 `npm test` 实测更新为 **82.43%**
- README 环境要求由 Node.js 14+ 收紧为 **22.23.4+ / 24.22.1+**（openai 4.x、Helmet 8 只要求 Node 18+，Jest 30 要求 18.14+；18/20 已 EOL，故按含 eMudhra CA 修复的安全版本设下限），并同步 `engines.node`
- README 默认账号改为可直接登录的固定演示账号，移除“你生成哈希时设置的明文密码”的占位说明

### 新增

- `npm run seed`：新增 `scripts/seed.js`，从 `.env` 读取数据库配置，幂等创建/重置演示账号 `admin / admin123`（管理员）和 `demo / demo123`（普通用户）
- `sql/init.sql` 内置可用的 `admin` 密码哈希（原为 `$2a$10$REPLACE_WITH_YOUR_BCRYPT_HASH` 占位符，导致默认账号无法登录）

---

## [1.2.0] - 2026-08-06

### 🧪 测试覆盖率提升

- **pollController.js**: 覆盖率从 56.7% 提升至 85.56%
    - 新增 `updatePoll` 完整测试（状态校验、权限校验、maxChoices 更新）
    - 新增 `getMyPolls` 完整测试（空列表、分页、数据库错误）
    - 新增 `deletePoll` 管理员权限测试
    - 新增 `getPollById` 空选项场景测试
    - 新增 `getPolls` 数据库错误处理测试

- **voteController.js**: 覆盖率从 63.96% 提升至 90.99%
    - 新增 `submitVote` 广播和缓存清除场景测试
    - 新增 `exportResults` 完整测试（导出成功、404、发送失败）
    - 补全 `getResults` 缓存命中/未命中场景测试

- **整体覆盖率**: 从 70.64% 提升至 **85.71%**

### 🔧 改进

- 优化 Jest 测试配置，增加模拟模块覆盖率
- 统一测试文件结构，增强可维护性

### 📝 文件变更

- `tests/pollController.test.js`: 新增 updatePoll / getMyPolls / deletePoll 补充测试
- `tests/voteController.test.js`: 新增 broadcast / exportResults 测试
- `controllers/voteController.js`: 优化导出错误处理逻辑
- `jest.config.js`: 调整覆盖率阈值配置

---

## [1.1.0] - 2026-07-31

### 新增

- **WebSocket 实时推送**：投票完成后，所有在线结果页即时更新
- **自动降级方案**：WebSocket 连接失败时自动切换至 3 秒轮询
- **AI 提示词优化**：增加场景识别（评选/满意度/活动）
- 每个投票独立房间广播，互不干扰
- 前端连接状态提示（实时推送已连接 / 已断开 / 降级中）

### 改进

- 移除结果页 1 秒轮询，降低服务器压力
- 图表切换使用缓存数据，无需重新请求
- 优化 `renderResults` 函数，保留 `maxChoices` 显示逻辑
- 完善 README 中英双语文档，增加 Docker 部署说明

### 修复

- 修复 WebSocket 连接中断后无法自动恢复的问题
- 修复多选投票最大可选数前端展示缺失的问题
- 修复 MySQL 字符集导致的乱码问题
- 修复 JWT_SECRET 默认值校验问题

### 文件变更

- `app.js`：新增 Socket.IO 服务初始化
- `controllers/voteController.js`：投票成功后广播最新结果
- `public/result.html`：引入 socket.io 客户端库
- `public/js/result.js`：重构为 WebSocket 模式
- `routes/ai.js`：优化 system prompt
- `docker-compose.yml`：新增 MySQL + Redis 容器配置
- `README.md`：中英双语，完善部署说明
- `package.json`：新增 `socket.io` 依赖

---

## [1.0.0] - 2026-07-20

### 新增

- 初始版本发布
- 用户注册 / 登录（JWT 认证）
- 投票创建、浏览、参与、删除
- 单选 / 多选投票支持
- 防刷票机制（数据库唯一索引）
- 投票结果 ECharts 图表（饼图 / 柱状图）
- AI 智能生成投票（DeepSeek API + Mock 降级）
- 批量填充功能（智能解析 + AI 优化）
- 快速模板（年会 / 评选 / 团建 / 创意）
- 多选投票最大可选数限制
- ESLint + Prettier 代码规范
- 响应式设计（Bootstrap 5）

---

## 版本说明

| 版本  | 发布日期   | 备注                               |
| ----- | ---------- | ---------------------------------- |
| 1.2.0 | 2026-08-06 | 测试覆盖率提升至 85.71%            |
| 1.1.0 | 2026-07-31 | WebSocket 实时推送 + Docker 容器化 |
| 1.0.0 | 2026-07-20 | 初始版本，核心功能完整             |
