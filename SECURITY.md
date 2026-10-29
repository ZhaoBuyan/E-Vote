# 安全策略

## 报告安全问题

请通过 GitHub Issues 或项目维护者邮箱私下报告，不要在公开 Issue 中贴出可直接利用的细节、真实 token 或数据库密码。

## 已知依赖告警（2026-10-29）

### GHSA-gcqx-w48m-w2h4 / deepmerge

- **依赖路径**：`jest` → `jest-config` → `deepmerge@4.3.1`
- **影响面**：仅开发依赖，用于 Jest 配置合并；不会进入生产运行时，也不会被应用代码直接调用。
- **当前状态**：截至 2026-10-29，`deepmerge` 最新版仍为 `4.3.1`，没有已修复版本。`npm audit fix --force` 给出的方案是降级到 `jest@25.1.0`，属于破坏性变更，因此没有采用。
- **生产依赖验证**：`npm audit --omit=dev` 为 **0 vulnerabilities**。
- **后续处理**：等 `deepmerge` 或 Jest 发布修复版本后再升级，并重新运行 `npm test` 与 `npm audit`。

## 生产部署最低要求

- 使用 Node.js 22.23.4+ / 24.22.1+（含 eMudhra CA 修复）
- 修改默认演示账号密码，删除不需要的演示账号
- 通过反向代理提供 HTTPS，并设置 `TRUST_PROXY=1`
- 按实际域名设置 `CORS_ORIGIN` 和 `CSP_CONNECT_SRC`
- 不要对公网暴露 MySQL / Redis 端口
