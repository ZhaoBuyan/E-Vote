if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_key_change_me') {
    console.error('❌ 错误: JWT_SECRET 未配置或使用默认值，请在 .env 中设置强密钥')
    process.exit(1)
}
const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const routes = require('./routes')
const { errorHandler } = require('./middleware/error-handler')

const app = express()
const PORT = process.env.PORT || 3000

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

app.listen(PORT, () => {
    console.log(`🚀 E-Vote 服务已启动: http://localhost:${PORT}`)
    console.log(`📊 默认管理员: admin / admin123`)
})
