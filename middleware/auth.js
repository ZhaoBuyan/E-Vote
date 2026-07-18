const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            code: 401,
            msg: '未登录或登录已过期'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                code: 401,
                msg: '登录已过期，请重新登录'
            });
        }
        return res.status(401).json({
            code: 401,
            msg: '无效的认证信息'
        });
    }
}

function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            code: 403,
            msg: '权限不足，需要管理员权限'
        });
    }
    next();
}

module.exports = { authMiddleware, adminMiddleware };