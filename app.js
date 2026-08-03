// app.js
require('dotenv').config() // 先加载环境变量

// 校验 JWT_SECRET（必须在 dotenv 之后）
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_key_change_me') {
    console.error('❌ 错误: JWT_SECRET 未配置或使用默认值，请在 .env 中设置强密钥')
    process.exit(1)
}

const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const logger = require('./config/logger')
const routes = require('./routes')
const { errorHandler } = require('./middleware/error-handler')

const app = express()
const PORT = process.env.PORT || 3000

// 创建 HTTP 服务器（用于 Socket.IO）
const server = http.createServer(app)

// 初始化 Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
})

// 将 io 实例挂载到 app，供路由使用
app.set('io', io)

// ============================================================
// 中间件
// ============================================================
app.use(cors())

// 请求日志中间件（记录每个请求）
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}`)
    next()
})

// 安全头
app.use(helmet())

// 全局限流（所有请求）
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    limit: 100, // 每个IP最多100次请求
    message: { code: 429, msg: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false
})
app.use(globalLimiter)

// API 限流（更严格）
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    message: { code: 429, msg: 'API 请求过于频繁，请稍后再试' }
})
app.use('/api', apiLimiter)

// 敏感接口严格限流（登录、注册、AI生成）
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { code: 429, msg: '操作过于频繁，请稍后再试' },
    skipSuccessfulRequests: true
})
app.use('/api/auth/login', strictLimiter)
app.use('/api/auth/register', strictLimiter)
app.use('/api/ai/generate-poll', strictLimiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件
app.use(express.static(path.join(__dirname, 'public')))
app.set('trust proxy', true)

// API路由
app.use('/api', routes)

// 错误处理
app.use(errorHandler)

// ============================================================
// Socket.IO 连接处理
// ============================================================
io.on('connection', (socket) => {
    logger.info(`🔌 客户端已连接: ${socket.id}`)

    socket.on('join-poll', (pollId) => {
        socket.join(`poll-${pollId}`)
        logger.info(`📊 客户端 ${socket.id} 加入房间 poll-${pollId}`)
    })

    socket.on('leave-poll', (pollId) => {
        socket.leave(`poll-${pollId}`)
        logger.info(`📊 客户端 ${socket.id} 离开房间 poll-${pollId}`)
    })

    socket.on('disconnect', () => {
        logger.info(`🔌 客户端已断开: ${socket.id}`)
    })
})

// 启动服务器（使用 server 而不是 app）
server.listen(PORT, () => {
    logger.info(`🚀 E-Vote 服务已启动: http://localhost:${PORT}`)
    logger.info(`📊 默认管理员: admin / admin123`)
})

module.exports = { app, server, io }
