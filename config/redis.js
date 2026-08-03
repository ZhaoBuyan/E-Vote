// config/redis.js
const redis = require('redis')

const client = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
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

module.exports = client
