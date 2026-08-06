---
lang: zh-CN
---

# 贡献指南

感谢你对 E-Vote 项目的关注！我们欢迎任何形式的贡献，无论是报告 Bug、提出新功能建议，还是提交代码。

在参与之前，请花几分钟阅读以下指南，以确保协作顺畅。

---

## 📋 目录

- [行为准则](#行为准则)
- [如何报告 Bug](#如何报告-bug)
- [如何提出功能建议](#如何提出功能建议)
- [如何提交代码](#如何提交代码)
    - [环境准备](#环境准备)
    - [分支规范](#分支规范)
    - [代码规范](#代码规范)
    - [提交信息规范](#提交信息规范)
    - [提交流程](#提交流程)
- [项目结构概览](#项目结构概览)
- [常见问题](#常见问题)

---

## 行为准则

本仓库遵循 [贡献者公约](https://www.contributor-covenant.org/zh-cn/version/2/0/code_of_conduct/)。参与本项目即表示你同意遵守其条款。

简单来说：

- 使用欢迎和包容的语言
- 尊重不同的观点和经验
- 友善地接受建设性批评
- 关注对项目最有利的事情

---

## 如何报告 Bug

如果你发现了 Bug，请先查看 [Issues](https://github.com/ZhaoBuyan/E-Vote/issues) 列表，确认该问题是否已被报告。如果未被报告，请 [新建一个 Issue](https://github.com/ZhaoBuyan/E-Vote/issues/new) 并填写以下信息：

- **简要描述**：用一句话概括问题
- **复现步骤**：如何触发该问题
- **预期行为**：你期望发生什么
- **实际行为**：实际发生了什么
- **环境信息**：操作系统、Node.js 版本、浏览器版本
- **截图或日志**（如有）

---

## 如何提出功能建议

如果你有好的想法，同样请先搜索 Issues 确认是否已被提出。新建 Issue 时请说明：

- **功能描述**：你想添加什么功能
- **使用场景**：这个功能解决什么问题
- **实现思路**（可选）：如果你已经有想法，可以附上

---

## 如何提交代码

### 环境准备

1. **Fork 本仓库** 到你的 GitHub 账号
2. **克隆你的 Fork** 到本地：
    ```bash
    git clone https://github.com/ZhaoBuyan/E-Vote.git
    cd E-Vote
    ```
3. **安装依赖**：
    ```bash
    npm install
    ```
4. **配置环境变量**：
    ```bash
    cp .env.example .env
    # 编辑 .env，填写数据库配置
    ```
5. **初始化数据库**：
    ```bash
    mysql -u root -p < sql/init.sql
    ```
6. **启动项目**：
    ```bash
    npm run dev
    ```

### 分支规范

- `main`：主分支，始终保持稳定可运行
- `feature/xxx`：新功能分支（从 `main` 切出）
- `fix/xxx`：Bug 修复分支（从 `main` 切出）
- `docs/xxx`：文档更新分支

分支名示例：

```
feature/add-vote-export
fix/login-timeout-error
docs/update-readme
```

### 代码规范

本项目使用 **ESLint** 和 **Prettier** 统一代码风格。提交前请确保代码已格式化：

```bash
# 格式化所有代码
npm run format   # 或 npx prettier --write .

# 检查 ESLint 问题
npm run lint     # 或 npx eslint .
```

如果尚未配置 `package.json` 脚本，可以直接使用：

```bash
npx prettier --write .
npx eslint --fix .
```

> 建议在 VSCode 中安装 ESLint 和 Prettier 扩展，并启用保存时自动格式化。

### 提交信息规范

提交信息应清晰描述本次变更，推荐使用以下格式：

```
<类型>: <简短描述>

<详细说明（可选）>
```

**类型**：

- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档更新
- `style`：代码格式调整（不影响逻辑）
- `refactor`：代码重构
- `test`：测试相关
- `chore`：构建工具、依赖更新等

**示例**：

```
feat: 增加投票结果导出为 CSV 功能

- 新增 /api/votes/:id/export 接口
- 支持导出为 CSV 格式
- 前端增加“导出”按钮
```

### 提交流程

1. **确保你的 Fork 与上游同步**：

    ```bash
    git remote add upstream https://github.com/ZhaoBuyan/E-Vote.git
    git fetch upstream
    git checkout main
    git merge upstream/main
    ```

2. **创建功能分支**：

    ```bash
    git checkout -b feature/your-feature-name
    ```

3. **提交你的修改**（遵循提交规范）

4. **推送到你的 Fork**：

    ```bash
    git push origin feature/your-feature-name
    ```

5. **创建 Pull Request**：
    - 前往本仓库的 Pull Requests 页面
    - 点击 New Pull Request
    - 选择你的分支
    - 填写 PR 描述，说明改动内容和测试情况

---

## 项目结构概览

```
e-vote/
├── app.js                 # 应用入口
├── config/                # 配置文件
├── controllers/           # 业务逻辑
├── middleware/            # 中间件（认证、错误处理）
├── routes/                # 路由定义
├── public/                # 前端静态文件
│   ├── index.html         # 投票列表
│   ├── poll.html          # 投票详情
│   ├── result.html        # 结果页
│   ├── create-poll.html   # 创建投票
│   └── js/                # 前端 JS
├── sql/                   # 数据库脚本
├── .eslintrc.json         # ESLint 配置
├── .prettierrc            # Prettier 配置
├── .env.example           # 环境变量模板
└── package.json
```

---

## 常见问题

### 1. 数据库连接失败

- 确认 MySQL 服务已启动
- 检查 `.env` 中的 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD` 是否正确
- 确认数据库 `e_vote` 已创建：`CREATE DATABASE e_vote;`

### 2. ESLint/Prettier 报错

- 确认已安装相关依赖：`npm install --save-dev eslint prettier`
- 在 VSCode 中安装 ESLint 和 Prettier 扩展
- 运行 `npx prettier --write .` 自动修复格式问题

### 3. WebSocket 连接失败

- 确认服务已正常启动
- 打开浏览器开发者工具，查看 Console 报错信息
- WebSocket 会尝试自动重连，也可手动刷新页面

### 4. 我不知道从哪里开始

- 查看 Issues 中标记为 `good-first-issue` 的问题
- 这些适合初次贡献者

## 提交 PR 后被合并的流程

1. 维护者会对 PR 进行 Code Review
2. 如有修改意见，请在原分支继续提交并推送（PR 会自动更新）
3. 通过审核后，PR 会被合并到 `main` 分支
4. 你的名字将被添加到贡献者列表中

---

## 联系方式

如有问题，可在此仓库的 Issues 中提出，或通过邮箱联系维护者。

感谢你的贡献！🎉

---

# Contributing Guide

Thank you for your interest in the E-Vote project! We welcome contributions of all kinds — bug reports, feature requests, and code contributions.

Please take a few minutes to read this guide to ensure smooth collaboration.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Report a Bug](#how-to-report-a-bug)
- [How to Suggest a Feature](#how-to-suggest-a-feature)
- [How to Submit Code](#how-to-submit-code)
    - [Environment Setup](#environment-setup)
    - [Branch Naming](#branch-naming)
    - [Code Style](#code-style)
    - [Commit Message Guidelines](#commit-message-guidelines)
    - [Workflow](#workflow)
- [Project Structure](#project-structure)
- [FAQ](#faq)

---

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/0/code_of_conduct/). By participating, you agree to abide by its terms.

In short:

- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what's best for the project

---

## How to Report a Bug

If you find a bug, first check the [Issues](https://github.com/ZhaoBuyan/E-Vote/issues) list to see if it has already been reported. If not, please [open a new Issue](https://github.com/ZhaoBuyan/E-Vote/issues/new) with the following information:

- **Brief description**: One sentence summary
- **Steps to reproduce**: How to trigger the issue
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: OS, Node.js version, browser version
- **Screenshots or logs** (if available)

---

## How to Suggest a Feature

If you have an idea, search the Issues first to see if it's already been suggested. When opening a new Issue, please include:

- **Feature description**: What you want to add
- **Use case**: What problem it solves
- **Implementation ideas** (optional): If you already have a plan

---

## How to Submit Code

### Environment Setup

1. **Fork this repository** to your GitHub account
2. **Clone your fork** locally:
    ```bash
    git clone https://github.com/ZhaoBuyan/E-Vote.git
    cd E-Vote
    ```
3. **Install dependencies**:
    ```bash
    npm install
    ```
4. **Configure environment variables**:
    ```bash
    cp .env.example .env
    # Edit .env with your database config
    ```
5. **Initialize the database**:
    ```bash
    mysql -u root -p < sql/init.sql
    ```
6. **Start the project**:
    ```bash
    npm run dev
    ```

### Branch Naming

- `main` — Stable production branch
- `feature/xxx` — New features (branch off `main`)
- `fix/xxx` — Bug fixes (branch off `main`)
- `docs/xxx` — Documentation updates

Examples:

```
feature/add-vote-export
fix/login-timeout-error
docs/update-readme
```

### Code Style

This project uses **ESLint** and **Prettier** to enforce code style. Please format your code before committing:

```bash
# Format all code
npm run format   # or npx prettier --write .

# Check ESLint issues
npm run lint     # or npx eslint .
```

If scripts are not yet configured, you can use:

```bash
npx prettier --write .
npx eslint --fix .
```

> It's recommended to install ESLint and Prettier extensions in VSCode with auto-formatting on save.

### Commit Message Guidelines

Commit messages should clearly describe the change. Use this format:

```
<type>: <short description>

<detailed description (optional)>
```

**Types**:

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation update
- `style` — Code style changes (no logic change)
- `refactor` — Code refactoring
- `test` — Testing related
- `chore` — Build tools, dependency updates, etc.

**Example**:

```
feat: add CSV export for poll results

- Add /api/votes/:id/export endpoint
- Support CSV format export
- Add "Export CSV" button on frontend
```

### Workflow

1. **Sync your fork with upstream**:

    ```bash
    git remote add upstream https://github.com/ZhaoBuyan/E-Vote.git
    git fetch upstream
    git checkout main
    git merge upstream/main
    ```

2. **Create a feature branch**:

    ```bash
    git checkout -b feature/your-feature-name
    ```

3. **Commit your changes** (follow commit guidelines)

4. **Push to your fork**:

    ```bash
    git push origin feature/your-feature-name
    ```

5. **Create a Pull Request**:
    - Go to the repository's Pull Requests page
    - Click New Pull Request
    - Select your branch
    - Fill in the PR description with what you changed and how to test

---

## Project Structure

```
e-vote/
├── app.js                 # Application entry
├── config/                # Configuration files
├── controllers/           # Business logic
├── middleware/            # Auth, error handling, etc.
├── routes/                # Route definitions
├── public/                # Static frontend files
│   ├── index.html         # Poll list
│   ├── poll.html          # Poll detail
│   ├── result.html        # Results page
│   ├── create-poll.html   # Create poll
│   └── js/                # Frontend JS
├── sql/                   # Database scripts
├── .eslintrc.json         # ESLint config
├── .prettierrc            # Prettier config
├── .env.example           # Environment template
└── package.json
```

---

## FAQ

### 1. Database connection fails

- Make sure MySQL is running
- Check `.env` DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
- Make sure database `e_vote` exists: `CREATE DATABASE e_vote;`

### 2. ESLint/Prettier errors

- Make sure dependencies are installed: `npm install --save-dev eslint prettier`
- Install ESLint and Prettier extensions in VSCode
- Run `npx prettier --write .` to auto-fix formatting

### 3. WebSocket connection fails

- Make sure the server is running
- Open browser dev tools and check Console for errors
- WebSocket will auto-reconnect; you can also manually refresh

### 4. I don't know where to start

- Check Issues labeled `good-first-issue`
- These are suitable for first-time contributors

## After PR is merged

1. Maintainers will review the PR
2. If changes are requested, push to the same branch (the PR updates automatically)
3. Once approved, the PR is merged into `main`
4. Your name will be added to the contributors list

---

## Contact

If you have questions, open an Issue or reach out via email.

Thanks for contributing! 🎉
