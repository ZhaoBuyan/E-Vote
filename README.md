---

## 📁 README.md


# E-Vote · AI 智能投票系统

> **AI 生成 · 实时推送 · 防刷票 — 全栈实战项目**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-orange.svg)](https://mysql.com/)

---

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

### 🛠️ 技术栈

| 层级     | 技术                                    |
| -------- | --------------------------------------- |
| 前端     | HTML5 · CSS3 · Bootstrap 5 · jQuery 3.x |
| 图表     | ECharts 5.x                             |
| 实时通信 | Socket.IO                               |
| 后端     | Node.js · Express 4.x                   |
| 数据库   | MySQL 8.x                               |
| 认证     | JWT · bcryptjs                          |
| AI       | DeepSeek API（OpenAI SDK）              |
| 代码规范 | ESLint · Prettier                       |
| 容器化   | Docker Compose（MySQL + Redis）         |

### 📁 项目结构

```
e-vote/
├── app.js                 # 应用入口（含 Socket.IO 初始化）
├── config/
│   └── db.js              # 数据库连接池
├── controllers/
│   ├── authController.js  # 认证逻辑
│   ├── pollController.js  # 投票 CRUD
│   └── voteController.js  # 投票提交 + 结果统计
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
├── sql/
│   └── init.sql           # 数据库建表脚本
├── docker-compose.yml     # MySQL + Redis 容器配置
├── .env.example           # 环境变量模板
└── README.md
```

### 📦 安装与运行

#### 环境要求

- Node.js 14+
- MySQL 5.7+ / 8.0
- Docker（可选，推荐）

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

# 4. 安装依赖并启动
npm install
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

# 5. 启动服务
npm run dev
```

### 🔑 默认账号

| 字段   | 值                         |
| ------ | -------------------------- |
| 用户名 | `admin`                    |
| 密码   | 你生成哈希时设置的明文密码 |

> 密码哈希生成命令：`node -e "console.log(require('bcryptjs').hashSync('你的密码', 10))"`

### 📡 API 接口

| 方法   | 地址                     | 说明         | 认证 |
| ------ | ------------------------ | ------------ | :--: |
| POST   | `/api/auth/register`     | 用户注册     |  ❌  |
| POST   | `/api/auth/login`        | 用户登录     |  ❌  |
| GET    | `/api/polls`             | 获取投票列表 |  ❌  |
| GET    | `/api/polls/:id`         | 获取投票详情 |  ❌  |
| POST   | `/api/polls`             | 创建投票     |  ✅  |
| DELETE | `/api/polls/:id`         | 删除投票     |  ✅  |
| POST   | `/api/votes/:id`         | 提交投票     |  ✅  |
| GET    | `/api/votes/:id/results` | 获取投票结果 |  ❌  |
| POST   | `/api/ai/generate-poll`  | AI 生成投票  |  ✅  |

### 💡 技术亮点

- **WebSocket 实时推送**：投票完成后，所有在线结果页即时更新，取代传统轮询
- **自动降级**：WebSocket 连接失败时自动切换 3 秒轮询，保证可用性
- **防刷票**：MySQL 唯一索引 `UNIQUE KEY (user_id, poll_id)`，从数据库层面杜绝重复投票
- **AI 场景识别**：根据主题自动识别“评选/满意度/活动”场景，生成对应风格内容
- **用户内容优先**：批量填充时，用户提供的选项被完全保留，AI 仅优化标题/描述
- **连接池 + 事务**：投票创建与提交均使用数据库事务，保证数据一致性
- **代码规范**：集成 ESLint + Prettier，统一代码风格

---

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

### 🛠️ Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | HTML5 · CSS3 · Bootstrap 5 · jQuery 3.x |
| Charts     | ECharts 5.x                             |
| Realtime   | Socket.IO                               |
| Backend    | Node.js · Express 4.x                   |
| Database   | MySQL 8.x                               |
| Auth       | JWT · bcryptjs                          |
| AI         | DeepSeek API (OpenAI SDK)               |
| Code Style | ESLint · Prettier                       |
| Container  | Docker Compose (MySQL + Redis)          |

### 📦 Installation & Running

#### Prerequisites

- Node.js 14+
- MySQL 5.7+ / 8.0
- Docker (optional, recommended)

#### Option 1: Docker Compose (Recommended)

```bash
git clone https://github.com/ZhaoBuyan/E-Vote.git
cd E-Vote
cp .env.example .env
# Edit .env with your config
docker-compose up -d
npm install
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
npm run dev
```

### 🔑 Default Account

| Field    | Value                                         |
| -------- | --------------------------------------------- |
| Username | `admin`                                       |
| Password | The password you set when generating the hash |

> Generate password hash: `node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"`

### 💡 Technical Highlights

- **WebSocket Real-time**: Instant updates after voting, replacing traditional polling
- **Auto Fallback**: WebSocket failure → auto switch to 3s polling
- **Anti-spam**: MySQL `UNIQUE KEY (user_id, poll_id)` prevents duplicate votes
- **AI Scene Recognition**: Auto-detects "selection/satisfaction/event" scenarios
- **User Content Priority**: User-provided options are fully preserved
- **Connection Pool + Transactions**: Atomic operations for data consistency
- **Code Quality**: ESLint + Prettier for consistent code style

---

## 📝 License

MIT © [ZhaoBuyan](https://github.com/ZhaoBuyan)

```

---
```
