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

const routes = require('./routes')
const { errorHandler } = require('./middleware/error-handler')

const app = express()
const PORT = process.env.PORT || 3000

// 创建 HTTP 服务器（用于 Socket.IO）
const server = http.createServer(app)

// 初始化 Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*', // 开发环境允许所有来源，生产环境应限制
        methods: ['GET', 'POST']
    }
})

// 将 io 实例挂载到 app，供路由使用
app.set('io', io)

// 中间件
app.use(cors())
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
    console.log('🔌 客户端已连接:', socket.id)

    // 客户端加入投票房间
    socket.on('join-poll', (pollId) => {
        socket.join(`poll-${pollId}`)
        console.log(`📊 客户端 ${socket.id} 加入房间 poll-${pollId}`)
    })

    // 客户端离开投票房间
    socket.on('leave-poll', (pollId) => {
        socket.leave(`poll-${pollId}`)
        console.log(`📊 客户端 ${socket.id} 离开房间 poll-${pollId}`)
    })

    socket.on('disconnect', () => {
        console.log('🔌 客户端已断开:', socket.id)
    })
})

// 启动服务器（使用 server 而不是 app）
server.listen(PORT, () => {
    console.log(`🚀 E-Vote 服务已启动: http://localhost:${PORT}`)
    console.log(`📊 默认管理员: admin / admin123`)
})

module.exports = { app, server, io }
