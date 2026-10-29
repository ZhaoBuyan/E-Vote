# E-Vote · AI 智能投票系统

> **AI 生成 · 实时推送 · 防刷票 · 缓存加速 — 全栈实战项目**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22.23.4%2B%20%2F%2024.22.1%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-orange.svg)](https://mysql.com/)

---

## 中文

### ✨ 核心功能

| 功能               | 说明                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| 🤖 **AI 智能生成** | 输入主题，AI 自动生成标题、描述和选项（支持场景识别：评选/满意度/活动） |
| ⚡ **实时推送**    | 基于 WebSocket，投票结果即时更新，无需手动刷新                          |
| 📊 **可视化图表**  | ECharts 饼图/柱状图切换，数据实时渲染                                   |
| 🛡️ **防刷票**      | 数据库唯一索引，同一用户对同一投票只能投一次                            |
| 📋 **批量填充**    | 按行粘贴标题/描述/选项，智能解析，AI 优化                               |
| 🎯 **快速模板**    | 一键填充“年会/评选/团建/创意”等常用场景                                 |
| 🔄 **自动降级**    | WebSocket 不可用时自动切换 3 秒轮询，保障可用性                         |
| 🖱️ **多选限制**    | 多选投票支持设置最大可选数，防止刷票                                    |
| 📱 **响应式设计**  | Bootstrap 5 适配 PC / 平板 / 手机                                       |
| 📝 **结构化日志**  | Winston 日志系统，JSON 格式输出，支持日志轮转                           |
| 🔒 **安全加固**    | Helmet 安全头 + 分层限流 + CSP（无 unsafe-inline）                      |
| 🧪 **单元测试**    | Jest 测试框架，覆盖核心控制器（覆盖率 82.43%）                            |
| 🗄️ **Redis 缓存**  | 投票结果缓存 10 秒，减轻数据库压力                                      |
| 🔁 **CI/CD**       | GitHub Actions 自动运行测试，保证代码质量                               |

### 🛠️ 技术栈

| 层级     | 技术                                    |
| -------- | --------------------------------------- |
| 前端     | HTML5 · CSS3 · Bootstrap 5 · jQuery 3.x |
| 图表     | ECharts 5.x                             |
| 实时通信 | Socket.IO                               |
| 后端     | Node.js · Express 4.x                   |
| 数据库   | MySQL 8.x                               |
| 缓存     | Redis 7.x                               |
| 认证     | JWT · bcryptjs                          |
| AI       | DeepSeek API（OpenAI SDK）              |
| 日志     | Winston                                 |
| 安全     | Helmet · express-rate-limit             |
| 测试     | Jest · Supertest                        |
| 代码规范 | ESLint · Prettier                       |
| 容器化   | Docker Compose（MySQL + Redis）         |
| CI/CD    | GitHub Actions                          |

### 📁 项目结构

```
e-vote/
├── app.js                 # 应用入口（含 Socket.IO 初始化）
├── config/
│   ├── db.js              # 数据库连接池
│   ├── logger.js          # Winston 日志配置
│   └── redis.js           # Redis 连接配置
├── controllers/
│   ├── authController.js  # 认证逻辑
│   ├── pollController.js  # 投票 CRUD
│   └── voteController.js  # 投票提交 + 结果统计（含 Redis 缓存）
├── middleware/
│   ├── auth.js            # JWT 认证
│   └── error-handler.js   # 全局错误处理
├── routes/
│   ├── auth.js            # 认证路由
│   ├── polls.js           # 投票路由
│   ├── votes.js           # 投票记录路由
│   └── ai.js              # AI 生成路由
├── public/
│   ├── index.html         # 投票列表
│   ├── poll.html          # 投票详情
│   ├── result.html        # 结果页（WebSocket 实时）
│   ├── create-poll.html   # 创建投票（AI + 批量填充）
│   └── js/                # 前端脚本
├── tests/                 # 单元测试（Jest）
│   ├── authController.test.js
│   ├── pollController.test.js
│   ├── voteController.test.js
│   ├── aiController.test.js
│   └── middleware/
│       └── auth.test.js
├── sql/
│   ├── init.sql           # 数据库建表脚本（含默认管理员）
│   └── migrations/
│       └── 001_vote_submissions.sql  # 旧 votes 表迁移脚本
├── scripts/
│   └── seed.js            # 生成/重置演示账号（npm run seed）
├── logs/                  # 日志文件（自动生成）
├── .github/workflows/
│   └── ci.yml             # GitHub Actions CI
├── docker-compose.yml     # MySQL + Redis 容器配置
├── .env.example           # 环境变量模板
├── jest.config.js         # Jest 测试配置
└── README.md
```

### 📦 安装与运行

#### 环境要求

- Node.js 22.23.4+ 或 24.22.1+（推荐 24 LTS）
- MySQL 5.7+ / 8.0
- Docker（可选，推荐）
- Redis（Docker Compose 已包含）

> Node.js 18/20 已 EOL，且不含 2026-10 的 [eMudhra 中间 CA 修复](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)；请使用上述已修复版本。
> 反向代理部署时设置 `TRUST_PROXY=1`；跨域前端通过 `CORS_ORIGIN` 配置白名单（默认只允许同源）；生产 WebSocket 通过 `CSP_CONNECT_SRC` 添加 `wss://你的域名`。

#### 方式一：Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/ZhaoBuyan/E-Vote.git
cd E-Vote

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 JWT_SECRET 和数据库配置

# 3. 启动 MySQL + Redis
docker-compose up -d

# 4. 安装依赖
npm install

# 5. 初始化演示账号（等待 MySQL 容器状态变为 healthy 后执行）
npm run seed

# 6. 启动服务
npm run dev
```

访问 `http://localhost:3000`

#### 方式二：本地运行（手动安装 MySQL）

```bash
# 1. 克隆项目
git clone https://github.com/ZhaoBuyan/E-Vote.git
cd E-Vote

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填写数据库密码和 JWT_SECRET

# 4. 初始化数据库
mysql -u root -p < sql/init.sql

# 5. 初始化演示账号
npm run seed

# 6. 启动服务
npm run dev
```

> 已有旧版数据库（旧 `votes` 表）请先执行迁移：`mysql -u root -p e_vote < sql/migrations/001_vote_submissions.sql`；新库直接使用 `sql/init.sql`，不要重复执行迁移。

#### 运行测试

```bash
npm test
```

当前语句覆盖率 **82.43%**，CI 在 Node.js 22.x / 24.x 上自动执行。

### 🔑 默认账号

首次运行请先生成演示账号（脚本幂等，可重复执行以重置密码）：

```bash
npm run seed
```

| 账号类型 | 用户名  | 密码       | 角色    |
| -------- | ------- | ---------- | ------- |
| 管理员   | `admin` | `admin123` | `admin` |
| 演示用户 | `demo`  | `demo123`  | `user`  |

> `npm run seed` 会读取 `.env` 中的数据库配置，创建或重置上述账号；`sql/init.sql` 也内置了可用的 `admin` 账号，初始化数据库后即可直接登录。
> 自定义密码：设置 `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` 后再执行 `npm run seed`。
> ⚠️ 上述账号仅供本地开发与演示使用；部署到公网前请修改密码或删除演示账号。

### 📡 API 接口

| 方法   | 地址                     | 说明             | 认证 |
| ------ | ------------------------ | ---------------- | :--: |
| POST   | `/api/auth/register`     | 用户注册         |  ❌  |
| POST   | `/api/auth/login`        | 用户登录         |  ❌  |
| GET    | `/api/auth/me`           | 获取当前用户信息 |  ✅  |
| GET    | `/api/polls`             | 获取投票列表     |  ❌  |
| GET    | `/api/polls/:id`         | 获取投票详情     |  ❌  |
| GET    | `/api/polls/my/list`     | 获取我的投票     |  ✅  |
| POST   | `/api/polls`             | 创建投票         |  ✅  |
| PUT    | `/api/polls/:id`         | 更新投票         |  ✅  |
| DELETE | `/api/polls/:id`         | 删除投票         |  ✅  |
| GET    | `/api/votes/:id/check`   | 检查是否已投票   |  ✅  |
| POST   | `/api/votes/:id`         | 提交投票         |  ✅  |
| GET    | `/api/votes/:id/results` | 获取投票结果     |  ❌  |
| GET    | `/api/votes/:id/export`  | 导出 CSV 结果    |  ✅  |
| POST   | `/api/ai/generate-poll`  | AI 生成投票      |  ✅  |

> 草稿（`draft`）投票不会出现在公开列表；详情、结果和导出仅创建者或管理员可见。

### 💡 技术亮点

- **WebSocket 实时推送**：投票完成后，所有在线结果页即时更新，取代传统轮询
- **Redis 缓存加速**：投票结果缓存 10 秒，Redis 不可用时自动回源数据库，不影响结果页
- **自动降级**：WebSocket 连接失败时自动切换 3 秒轮询，保证可用性
- **防刷票**：`vote_submissions` 的 `UNIQUE KEY (user_id, poll_id)` 配合事务与行锁，从数据库层面杜绝重复投票
- **AI 场景识别**：根据主题自动识别“评选/满意度/活动”场景，生成对应风格内容
- **用户内容优先**：批量填充时，用户提供的选项被完全保留，AI 仅优化标题/描述
- **连接池 + 事务**：投票创建与提交均使用数据库事务，保证数据一致性
- **代码规范**：集成 ESLint + Prettier，统一代码风格
- **结构化日志**：Winston 日志系统，JSON 格式输出，支持日志轮转和按级别分类
- **安全加固**：Helmet 安全头 + 分层限流 + CSP（无 unsafe-inline）
- **单元测试**：Jest 覆盖核心控制器，语句覆盖率 82.43%
- **CI/CD**：GitHub Actions 自动运行测试，保障代码质量

---

## English

### ✨ Features

| Feature                   | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| 🤖 **AI Generation**      | Enter a topic, AI auto-generates title, description, and options |
| ⚡ **Real-time Push**     | WebSocket-based live updates, no manual refresh needed           |
| 📊 **Visual Charts**      | ECharts pie/bar chart toggle with real-time data                 |
| 🛡️ **Anti-spam**          | MySQL unique key prevents duplicate voting                       |
| 📋 **Batch Fill**         | Paste title/desc/options line by line with smart parsing         |
| 🎯 **Quick Templates**    | One-click templates for common scenarios                         |
| 🔄 **Auto Fallback**      | WebSocket unavailable → auto switch to 3s polling                |
| 🖱️ **Multi-choice Limit** | Set max selectable options for multi-choice polls                |
| 📱 **Responsive**         | Bootstrap 5 for PC / tablet / mobile                             |
| 📝 **Structured Logging** | Winston logger with JSON format and rotation                     |
| 🔒 **Security Hardening** | Helmet + layered rate limiting + CSP without unsafe-inline       |
| 🧪 **Unit Testing**       | Jest test coverage for core controllers (82.43%)                   |
| 🗄️ **Redis Cache**        | Poll results cached for 10s to reduce DB load                    |
| 🔁 **CI/CD**              | GitHub Actions auto-runs tests on every push                     |

### 🛠️ Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | HTML5 · CSS3 · Bootstrap 5 · jQuery 3.x |
| Charts     | ECharts 5.x                             |
| Realtime   | Socket.IO                               |
| Backend    | Node.js · Express 4.x                   |
| Database   | MySQL 8.x                               |
| Cache      | Redis 7.x                               |
| Auth       | JWT · bcryptjs                          |
| AI         | DeepSeek API (OpenAI SDK)               |
| Logging    | Winston                                 |
| Security   | Helmet · express-rate-limit             |
| Testing    | Jest · Supertest                        |
| Code Style | ESLint · Prettier                       |
| Container  | Docker Compose (MySQL + Redis)          |
| CI/CD      | GitHub Actions                          |

### 📦 Installation & Running

#### Prerequisites

- Node.js 22.23.4+ or 24.22.1+ (24 LTS recommended)
- MySQL 5.7+ / 8.0
- Docker (optional, recommended)
- Redis (included in Docker Compose)

> Node.js 18/20 are EOL and lack the October 2026 [eMudhra intermediate CA fix](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases); use one of the patched versions above.
> Set `TRUST_PROXY=1` when behind a reverse proxy; configure `CORS_ORIGIN` for cross-origin frontends (same-origin only by default); add `wss://your-domain` to `CSP_CONNECT_SRC` for production WebSocket.

#### Option 1: Docker Compose (Recommended)

```bash
git clone https://github.com/ZhaoBuyan/E-Vote.git
cd E-Vote
cp .env.example .env
# Edit .env with your config
docker-compose up -d
npm install
# Wait until MySQL reports healthy
npm run seed
npm run dev
```

Visit `http://localhost:3000`

#### Option 2: Local (Manual MySQL)

```bash
git clone https://github.com/ZhaoBuyan/E-Vote.git
cd E-Vote
npm install
cp .env.example .env
# Edit .env with your config
mysql -u root -p < sql/init.sql
npm run seed
npm run dev
```

> Upgrading an existing database with the old `votes` table? Run `mysql -u root -p e_vote < sql/migrations/001_vote_submissions.sql`; fresh installs only need `sql/init.sql`.

#### Run Tests

```bash
npm test
```

Current statement coverage is **82.43%**; CI runs it on Node.js 22.x / 24.x.

### 🔑 Default Accounts

Run the seed script first (idempotent; re-running it resets the passwords below):

```bash
npm run seed
```

| Type     | Username | Password   | Role    |
| -------- | -------- | ---------- | ------- |
| Admin    | `admin`  | `admin123` | `admin` |
| Demo     | `demo`   | `demo123`  | `user`  |

> `npm run seed` reads the database settings from `.env` and creates or resets both accounts. `sql/init.sql` also ships with a working `admin` account, so you can log in right after initializing the database.
> Draft polls are excluded from the public list; details, results, and exports are visible only to the creator or an admin.
> Custom passwords: set `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD` before running `npm run seed`.
> ⚠️ These accounts are for local development and demos only. Change the passwords or remove the accounts before exposing the app publicly.

### 💡 Technical Highlights

- **WebSocket Real-time**: Instant updates after voting, replacing traditional polling
- **Redis Cache**: Poll results cached for 10s; falls back to MySQL when Redis is unavailable
- **Auto Fallback**: WebSocket failure → auto switch to 3s polling
- **Anti-spam**: `vote_submissions` `UNIQUE KEY (user_id, poll_id)` with transactions and row locks prevents duplicate votes
- **AI Scene Recognition**: Auto-detects "selection/satisfaction/event" scenarios
- **User Content Priority**: User-provided options are fully preserved
- **Connection Pool + Transactions**: Atomic operations for data consistency
- **Code Quality**: ESLint + Prettier for consistent code style
- **Structured Logging**: Winston logger with JSON format and rotation
- **Security**: Helmet + layered rate limiting + CSP without unsafe-inline
- **Testing**: Jest coverage for core controllers (82.43%)
- **CI/CD**: GitHub Actions auto-runs tests on every push

---

## 📝 License

MIT © [ZhaoBuyan](https://github.com/ZhaoBuyan)
