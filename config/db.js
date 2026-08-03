const logger = require('./logger')
const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'e_vote',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
})

// 测试连接
pool.getConnection()
    .then((conn) => {
        logger.info('✅ 数据库连接成功')
        conn.release()
    })
    .catch((err) => {
        logger.error('❌ 数据库连接失败:', err.message)
    })

module.exports = pool
