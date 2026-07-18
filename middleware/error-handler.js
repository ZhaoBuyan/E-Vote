function errorHandler(err, req, res, next) {
    console.error('❌ 服务器错误:', err);

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            code: 401,
            msg: '无效的认证信息'
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            code: 400,
            msg: err.message
        });
    }

    return res.status(500).json({
        code: 500,
        msg: '服务器内部错误'
    });
}

module.exports = { errorHandler };