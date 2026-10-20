#!/usr/bin/env node
/**
 * E-Vote 演示账号初始化脚本
 *
 * 用法：npm run seed
 *
 * 幂等：账号不存在时创建，已存在时重置密码、姓名和角色。
 * 数据库连接信息从 .env 读取，默认值与 config/db.js 保持一致。
 */
require('dotenv').config()

const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')

const ACCOUNTS = [
    {
        username: 'admin',
        password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
        realName: '系统管理员',
        role: 'admin'
    },
    {
        username: 'demo',
        password: process.env.SEED_DEMO_PASSWORD || 'demo123',
        realName: '演示用户',
        role: 'user'
    }
]

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'e_vote',
        charset: 'utf8mb4'
    })

    try {
        for (const account of ACCOUNTS) {
            const passwordHash = await bcrypt.hash(account.password, 10)
            await connection.execute(
                `INSERT INTO users (username, password, real_name, role)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                     password = VALUES(password),
                     real_name = VALUES(real_name),
                     role = VALUES(role)`,
                [account.username, passwordHash, account.realName, account.role]
            )
            const label = account.role === 'admin' ? '管理员' : '演示用户'
            console.log(`✅ ${label}：${account.username} / ${account.password}`)
        }
    } finally {
        await connection.end()
    }
}

seed()
    .then(() => {
        console.log(`\n🎉 演示账号已就绪，可访问 http://localhost:${process.env.PORT || 3000} 登录`)
        console.log('⚠️  仅供本地开发与演示，请勿在生产环境使用默认密码')
    })
    .catch((err) => {
        console.error('❌ 初始化演示账号失败：', err.message)
        if (err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
            console.error(
                '   请先初始化数据库：docker-compose up -d（首次启动自动执行 sql/init.sql），' +
                    '或手动执行 mysql -u root -p < sql/init.sql'
            )
        } else if (err.code === 'ECONNREFUSED') {
            console.error('   请确认 MySQL 已启动，并检查 .env 中的 DB_HOST / DB_PORT')
        }
        process.exitCode = 1
    })
