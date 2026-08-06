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
