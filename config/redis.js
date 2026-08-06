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
    // 生产/开发环境：真实 Redis 连接
    client = redis.createClient({
        socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            family: 4
        }
    })

    client.on('error', (err) => {
        console.error('Redis 连接错误:', err)
    })

    client.on('connect', () => {
        console.log('✅ Redis 连接成功')
    })
    ;(async () => {
        await client.connect()
    })()
}

module.exports = client
