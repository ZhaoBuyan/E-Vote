// tests/middleware/auth.test.js
const { authMiddleware } = require('../../middleware/auth')
const jwt = require('jsonwebtoken')

// 模拟 jsonwebtoken
jest.mock('jsonwebtoken')

describe('authMiddleware', () => {
    let req, res, next

    beforeEach(() => {
        req = {
            headers: {}
        }
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        next = jest.fn()
        jest.clearAllMocks()
    })

    test('应该返回 401 如果没有 Authorization 头', () => {
        req.headers.authorization = undefined

        authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '未登录或登录已过期'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该返回 401 如果 Authorization 头不以 Bearer 开头', () => {
        req.headers.authorization = 'Basic token123'

        authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '未登录或登录已过期'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该返回 401 如果 token 无效（jsonwebtoken 抛出错误）', () => {
        req.headers.authorization = 'Bearer invalid_token'
        jwt.verify.mockImplementation(() => {
            throw new Error('invalid token')
        })

        authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '无效的认证信息'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该返回 401 如果 token 已过期', () => {
        req.headers.authorization = 'Bearer expired_token'
        const error = new Error('jwt expired')
        error.name = 'TokenExpiredError'
        jwt.verify.mockImplementation(() => {
            throw error
        })

        authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '登录已过期，请重新登录'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该调用 next() 并挂载 user 到 req 如果 token 有效', () => {
        req.headers.authorization = 'Bearer valid_token'
        const decoded = { id: 1, username: 'testuser', role: 'user' }
        jwt.verify.mockReturnValue(decoded)

        authMiddleware(req, res, next)

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET)
        expect(req.user).toEqual(decoded)
        expect(next).toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
    })
})
