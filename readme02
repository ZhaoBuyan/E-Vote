# E-Vote - Online Voting System

A full-stack online voting system built with Node.js, Express, MySQL, Bootstrap, and jQuery. Supports real-time voting, anti-spam mechanism, live result charts with auto-refresh, and **AI-powered poll generation**.

---

## 🚀 Features

- **User Authentication**: Register / Login with JWT token
- **Poll Management**: Create, view, and delete polls
- **Voting**: Single-choice and multi-choice voting with anti-spam protection
- **Real-time Results**: ECharts charts (pie/bar) with 1-second auto-refresh
- **AI-Powered Poll Generation**: Generate complete polls from a topic using DeepSeek API
- **Quick Templates**: One-click templates for common scenarios (年会, 评选, 能力评价, 团建, 创意)
- **Batch Fill**: Paste title, description, and options in plain text format with intelligent parsing
- **Smart AI Detection**: Automatically detects if content needs optimization and applies AI enhancement
- **Role-based Access**: Admin and regular user roles
- **Responsive Design**: Bootstrap 5 for mobile-friendly interface

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Bootstrap 5, jQuery 3.x |
| Charts | ECharts 5.x |
| Backend | Node.js, Express 4.x |
| Database | MySQL 8.x |
| Authentication | JWT, bcryptjs |
| AI Integration | DeepSeek API (OpenAI SDK) |
| Others | node-schedule (auto-close expired polls) |

---

## 📁 Project Structure

```
e-vote/
├── app.js                 # Application entry
├── package.json           # Dependencies
├── .env                   # Environment variables
├── config/
│   └── db.js              # Database connection pool
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── error-handler.js   # Global error handler
├── routes/
│   ├── index.js           # Route aggregation
│   ├── auth.js            # Auth routes
│   ├── polls.js           # Poll routes
│   ├── votes.js           # Vote routes
│   └── ai.js              # AI generation routes
├── controllers/
│   ├── authController.js
│   ├── pollController.js
│   └── voteController.js
├── sql/
│   └── init.sql           # Database schema
└── public/
    ├── index.html         # Poll list
    ├── poll.html          # Vote page
    ├── result.html        # Results with charts
    ├── create-poll.html   # Create poll (with AI & batch fill)
    ├── my-polls.html      # My polls
    ├── login.html
    ├── register.html
    ├── css/
    └── js/
```

---

## 📦 Installation

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or v8.0)

### Step 1: Clone the repository

```bash
git clone https://github.com/yourusername/e-vote.git
cd e-vote
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment variables

Create a `.env` file in the root directory:

```env
PORT=3000
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=e_vote

# DeepSeek API Configuration (optional, Mock mode available)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
```

### Step 4: Initialize the database

```bash
mysql -u root -p
```

Then execute:
```sql
SET NAMES utf8mb4;
DROP DATABASE IF EXISTS e_vote;
CREATE DATABASE e_vote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE e_vote;
SOURCE sql/init.sql;
```

### Step 5: Generate admin password hash

```bash
node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"
```

Copy the output hash and update the `password` field for the `admin` user in `sql/init.sql`.

### Step 6: Start the server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 🔑 Default Admin Account

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | The password you used when generating the hash |

---

## 🤖 AI-Powered Features

### 1. AI Smart Generation
Enter a topic in the title field and click "✨ AI 生成" — the system will automatically generate:
- A well-crafted poll title
- A detailed poll description
- 4-6 relevant options

### 2. Quick Templates
One-click templates for common scenarios:
- 🎭 年会 (Annual party)
- 🏆 评选 (Selection/Awards)
- 📊 能力评价 (Capability evaluation)
- 🏕️ 团建 (Team building)
- 💡 创意 (Creative ideas)

### 3. Batch Fill (Import)
Paste content in plain text format with intelligent parsing:
```
First line: Poll title
Second line: Poll description (optional)
Following lines: Each option per line
```

**Smart Features:**
- Automatically detects if the second line is a description or an option
- Works with or without descriptions
- Preserves user-provided options (AI only optimizes title/description)
- Content complete → Direct fill (fastest)
- Content incomplete → Auto AI optimization

### 4. AI Mock Mode
If the DeepSeek API is unavailable or network is down, the system automatically falls back to **Mock mode** with preset templates — ensuring the demo never fails.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | User registration | No |
| POST | `/api/auth/login` | User login | No |
| GET | `/api/auth/me` | Get current user info | Yes |
| GET | `/api/polls` | Get poll list | No |
| GET | `/api/polls/:id` | Get poll details | No |
| POST | `/api/polls` | Create a poll | Yes |
| PUT | `/api/polls/:id` | Update a poll | Yes |
| DELETE | `/api/polls/:id` | Delete a poll | Yes |
| GET | `/api/polls/my/list` | Get my polls | Yes |
| POST | `/api/votes/:id` | Submit a vote | Yes |
| GET | `/api/votes/:id/check` | Check if user voted | Yes |
| GET | `/api/votes/:id/results` | Get poll results | No |
| POST | `/api/ai/generate-poll` | AI generate poll content | Yes |

---

## 💡 Key Technical Highlights

- **Anti-spam**: MySQL `UNIQUE KEY (user_id, poll_id)` to prevent duplicate votes
- **Real-time updates**: Frontend polls results every 1 second with ECharts charts
- **Password security**: bcrypt hashing for passwords
- **JWT authentication**: Stateless token-based auth
- **Transaction support**: Atomic operations for vote creation
- **Auto-schedule**: Expired polls auto-close at 2 AM daily
- **AI Integration**: DeepSeek API with automatic Mock fallback
- **Smart Parsing**: Intelligent detection of user input format

---

## 📝 License

MIT License


---

# E-Vote - 在线投票系统

基于 Node.js + Express + MySQL + Bootstrap + jQuery 构建的全栈在线投票系统。支持实时投票、防刷票机制、图表化结果展示自动刷新，以及 **AI 智能生成投票**。

---

## 🚀 功能特性

- **用户认证**：注册 / 登录，JWT Token 鉴权
- **投票管理**：创建、查看、删除投票
- **投票参与**：支持单选 / 多选，防重复投票
- **实时结果**：ECharts 图表（饼图/柱状图），1 秒自动刷新
- **AI 智能生成**：输入主题，AI 自动生成标题、描述和选项（DeepSeek API）
- **快速模板**：一键使用常用场景模板（年会、评选、能力评价、团建、创意）
- **批量填充**：粘贴纯文本内容，智能解析标题、描述和选项
- **智能 AI 检测**：内容完整时直接填充，不完整时自动调用 AI 优化
- **角色权限**：管理员与普通用户
- **响应式设计**：Bootstrap 5 适配移动端

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5, CSS3, Bootstrap 5, jQuery 3.x |
| 图表 | ECharts 5.x |
| 后端 | Node.js, Express 4.x |
| 数据库 | MySQL 8.x |
| 认证 | JWT, bcryptjs |
| AI 集成 | DeepSeek API（OpenAI SDK） |
| 定时任务 | node-schedule（自动关闭过期投票） |

---

## 📁 项目结构

```
e-vote/
├── app.js                 # 应用入口
├── package.json           # 依赖配置
├── .env                   # 环境变量
├── config/
│   └── db.js              # 数据库连接池
├── middleware/
│   ├── auth.js            # JWT 鉴权
│   └── error-handler.js   # 全局错误处理
├── routes/
│   ├── index.js           # 路由汇总
│   ├── auth.js            # 认证路由
│   ├── polls.js           # 投票路由
│   ├── votes.js           # 投票记录路由
│   └── ai.js              # AI 生成路由
├── controllers/
│   ├── authController.js
│   ├── pollController.js
│   └── voteController.js
├── sql/
│   └── init.sql           # 数据库初始化脚本
└── public/
    ├── index.html         # 投票列表
    ├── poll.html          # 投票页面
    ├── result.html        # 结果页（图表）
    ├── create-poll.html   # 创建投票（含 AI 和批量填充）
    ├── my-polls.html      # 我的投票
    ├── login.html
    ├── register.html
    ├── css/
    └── js/
```

---

## 📦 安装部署

### 环境要求

- Node.js（v14 或更高）
- MySQL（v5.7 或 v8.0）

### 第一步：克隆项目

```bash
git clone https://github.com/yourusername/e-vote.git
cd e-vote
```

### 第二步：安装依赖

```bash
npm install
```

### 第三步：配置环境变量

在项目根目录创建 `.env` 文件：

```env
PORT=3000
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=e_vote

# DeepSeek API 配置（可选，无 API Key 时自动使用 Mock 模式）
DEEPSEEK_API_KEY=sk-你的DeepSeek密钥
```

### 第四步：初始化数据库

```bash
mysql -u root -p
```

然后执行：
```sql
SET NAMES utf8mb4;
DROP DATABASE IF EXISTS e_vote;
CREATE DATABASE e_vote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE e_vote;
SOURCE sql/init.sql;
```

### 第五步：生成管理员密码哈希

```bash
node -e "console.log(require('bcryptjs').hashSync('你的密码', 10))"
```

将生成的哈希值替换 `sql/init.sql` 中 `admin` 用户的 `password` 字段。

### 第六步：启动项目

```bash
npm run dev
```

访问 `http://localhost:3000`

---

## 🔑 默认管理员账号

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | 你生成哈希时使用的明文密码 |

---

## 🤖 AI 智能功能

### 1. AI 智能生成
在标题框输入主题，点击「✨ AI 生成」，系统自动生成：
- 精炼的投票标题
- 详细的投票说明
- 4-6 个相关选项

### 2. 快速模板
一键使用常用场景模板：
- 🎭 年会
- 🏆 评选
- 📊 能力评价
- 🏕️ 团建
- 💡 创意

### 3. 批量填充（快速导入）
粘贴纯文本内容，智能解析：
```
第一行：投票标题
第二行：投票说明（可选）
后续行：每行一个选项
```

**智能特性：**
- 自动判断第二行是说明还是选项
- 支持有无说明两种格式
- 完全保留用户提供的选项（AI 只优化标题/说明）
- 内容完整 → 直接填充（最快）
- 内容不完整 → 自动 AI 优化

### 4. AI Mock 模式
如果 DeepSeek API 不可用或网络不通，系统自动切换到 **Mock 模式**，使用预设模板填充，保证演示永不出错。

---

## 📡 API 接口列表

| 方法 | 地址 | 说明 | 需认证 |
|------|------|------|:---:|
| POST | `/api/auth/register` | 用户注册 | ✗ |
| POST | `/api/auth/login` | 用户登录 | ✗ |
| GET | `/api/auth/me` | 获取当前用户信息 | ✓ |
| GET | `/api/polls` | 获取投票列表 | ✗ |
| GET | `/api/polls/:id` | 获取投票详情 | ✗ |
| POST | `/api/polls` | 创建投票 | ✓ |
| PUT | `/api/polls/:id` | 更新投票 | ✓ |
| DELETE | `/api/polls/:id` | 删除投票 | ✓ |
| GET | `/api/polls/my/list` | 获取我创建的投票 | ✓ |
| POST | `/api/votes/:id` | 提交投票 | ✓ |
| GET | `/api/votes/:id/check` | 检查是否已投票 | ✓ |
| GET | `/api/votes/:id/results` | 获取投票结果 | ✗ |
| POST | `/api/ai/generate-poll` | AI 生成投票内容 | ✓ |

---

## 💡 核心技术亮点

- **防刷票机制**：MySQL 唯一索引 `UNIQUE KEY (user_id, poll_id)` 保证同一用户对同一投票只能投一次
- **实时数据更新**：前端 1 秒轮询 + ECharts 图表，模拟"准实时"看板
- **密码安全**：bcrypt 加密存储，防止明文泄露
- **无状态认证**：JWT Token，适合前后端分离架构
- **事务支持**：投票创建与数据更新保持原子性
- **定时任务**：每天凌晨 2 点自动关闭过期投票
- **AI 集成**：DeepSeek API + 自动 Mock 回退，保障演示稳定性
- **智能解析**：自动识别用户输入格式，无缝填充

---

## 📝 开源协议

MIT License