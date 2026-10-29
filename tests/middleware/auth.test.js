// tests/middleware/auth.test.js
const { authMiddleware, optionalAuthMiddleware } = require('../../middleware/auth')
const jwt = require('jsonwebtoken')

jest.mock('jsonwebtoken')
jest.mock('../../config/db', () => ({
    execute: jest.fn()
}))

const pool = require('../../config/db')

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
        pool.execute.mockResolvedValue([[{ id: 1, username: 'testuser', role: 'user' }]])
    })

    test('应该返回 401 如果没有 Authorization 头', async () => {
        req.headers.authorization = undefined

        await authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '未登录或登录已过期'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该返回 401 如果 Authorization 头不以 Bearer 开头', async () => {
        req.headers.authorization = 'Basic token123'

        await authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '未登录或登录已过期'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该返回 401 如果 token 无效（jsonwebtoken 抛出错误）', async () => {
        req.headers.authorization = 'Bearer invalid_token'
        jwt.verify.mockImplementation(() => {
            throw new Error('invalid token')
        })

        await authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '无效的认证信息'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该返回 401 如果 token 已过期', async () => {
        req.headers.authorization = 'Bearer expired_token'
        const error = new Error('jwt expired')
        error.name = 'TokenExpiredError'
        jwt.verify.mockImplementation(() => {
            throw error
        })

        await authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '登录已过期，请重新登录'
        })
        expect(next).not.toHaveBeenCalled()
    })

    test('应该调用 next() 并以数据库中的用户信息挂载 req.user', async () => {
        req.headers.authorization = 'Bearer valid_token'
        jwt.verify.mockReturnValue({ id: 1, username: 'stale', role: 'admin' })

        await authMiddleware(req, res, next)

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET)
        expect(pool.execute).toHaveBeenCalledWith(
            'SELECT id, username, role FROM users WHERE id = ?',
            [1]
        )
        expect(req.user).toEqual({ id: 1, username: 'testuser', role: 'user' })
        expect(next).toHaveBeenCalled()
        expect(res.status).not.toHaveBeenCalled()
        expect(res.json).not.toHaveBeenCalled()
    })

    test('应该返回 401 如果 token 对应数据库用户不存在', async () => {
        req.headers.authorization = 'Bearer valid_token'
        jwt.verify.mockReturnValue({ id: 999, username: 'deleted', role: 'admin' })
        pool.execute.mockResolvedValueOnce([[]])

        await authMiddleware(req, res, next)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({
            code: 401,
            msg: '用户不存在或已被删除'
        })
        expect(next).not.toHaveBeenCalled()
    })
})

describe('optionalAuthMiddleware', () => {
    let req, res, next

    beforeEach(() => {
        req = { headers: {} }
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
        next = jest.fn()
        jest.clearAllMocks()
    })

    test('没有 token 时按匿名继续', async () => {
        await optionalAuthMiddleware(req, res, next)
        expect(req.user).toBeUndefined()
        expect(next).toHaveBeenCalled()
    })

    test('有效 token 时挂载数据库中的用户', async () => {
        req.headers.authorization = 'Bearer valid_token'
        jwt.verify.mockReturnValue({ id: 1, username: 'stale', role: 'admin' })
        pool.execute.mockResolvedValueOnce([[{ id: 1, username: 'testuser', role: 'user' }]])

        await optionalAuthMiddleware(req, res, next)

        expect(req.user).toEqual({ id: 1, username: 'testuser', role: 'user' })
        expect(next).toHaveBeenCalled()
    })

    test('无效 token 时按匿名继续', async () => {
        req.headers.authorization = 'Bearer invalid_token'
        jwt.verify.mockImplementation(() => {
            throw new Error('invalid token')
        })

        await optionalAuthMiddleware(req, res, next)

        expect(req.user).toBeUndefined()
        expect(next).toHaveBeenCalled()
    })
})
