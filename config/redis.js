// config/redis.js
const redis = require('redis')

let client

if (process.env.NODE_ENV === 'test') {
    // 测试环境：导出模拟客户端，不连接真实 Redis
    client = {
        on: jest.fn(),
        connect: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn()
    }
    console.log('🧪 测试环境：使用模拟 Redis 客户端')
} else {
    let lastErrorAt = 0

    // 生产/开发环境：真实 Redis 连接
    client = redis.createClient({
        socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            family: 4,
            connectTimeout: 2000,
            reconnectStrategy: (retries) => Math.min(1000 + retries * 500, 5000)
        },
        // Redis 不可用时不要排队命令，缓存读写应立即失败并走数据库降级
        disableOfflineQueue: true
    })

    client.on('error', (err) => {
        const now = Date.now()
        // 避免 Redis 宕机时每秒刷屏
        if (now - lastErrorAt > 60 * 1000) {
            console.error('Redis 连接错误（缓存功能降级）:', err.message)
            lastErrorAt = now
        }
    })

    client.on('connect', () => {
        console.log('✅ Redis 连接成功')
    })

    ;(async () => {
        try {
            await client.connect()
        } catch (err) {
            console.error('Redis 初始连接失败，缓存功能降级:', err.message)
        }
    })()
}

module.exports = client
