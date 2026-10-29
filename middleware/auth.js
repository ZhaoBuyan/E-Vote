const jwt = require('jsonwebtoken')
const pool = require('../config/db')

function getBearerToken(req) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null
    return authHeader.slice(7).trim() || null
}

async function loadUser(decoded) {
    const [users] = await pool.execute(
        'SELECT id, username, role FROM users WHERE id = ?',
        [decoded.id]
    )
    return users.length > 0 ? users[0] : null
}

async function authMiddleware(req, res, next) {
    const token = getBearerToken(req)
    if (!token) {
        return res.status(401).json({
            code: 401,
            msg: '未登录或登录已过期'
        })
    }

    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                code: 401,
                msg: '登录已过期，请重新登录'
            })
        }
        return res.status(401).json({
            code: 401,
            msg: '无效的认证信息'
        })
    }

    try {
        const user = await loadUser(decoded)
        if (!user) {
            return res.status(401).json({
                code: 401,
                msg: '用户不存在或已被删除'
            })
        }
        // 角色以数据库为准，避免 token 中的旧角色在 24 小时内继续生效
        req.user = { id: user.id, username: user.username, role: user.role }
        next()
    } catch (err) {
        console.error('认证用户查询失败:', err)
        return res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

// 公开接口的可选认证：有合法 token 就挂载最新用户，没有也继续
async function optionalAuthMiddleware(req, res, next) {
    const token = getBearerToken(req)
    if (!token) return next()

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await loadUser(decoded)
        if (user) {
            req.user = { id: user.id, username: user.username, role: user.role }
        }
    } catch (err) {
        // 公开接口对无效 token 按匿名处理，不阻断公开数据
    }
    next()
}

function adminMiddleware(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            code: 403,
            msg: '权限不足，需要管理员权限'
        })
    }
    next()
}

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware }
