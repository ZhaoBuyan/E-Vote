// tests/authController.test.js
const authController = require('../controllers/authController')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// 模拟数据库
jest.mock('../config/db', () => ({
    execute: jest.fn(),
    query: jest.fn(),
    getConnection: jest.fn()
}))

jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const pool = require('../config/db')

describe('authController', () => {
    let req, res

    beforeEach(() => {
        req = { body: {}, params: {}, user: {} }
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        jest.clearAllMocks()
    })

    describe('register', () => {
        it('should return 400 if missing fields', async () => {
            req.body = { username: 'test', password: '123456' } // missing realName
            await authController.register(req, res)
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '请填写所有必填字段'
                })
            )
        })

        it('should return 400 if username already exists', async () => {
            req.body = { username: 'test', password: '123456', realName: 'Test User' }
            pool.execute.mockResolvedValueOnce([[{ id: 1 }]])
            await authController.register(req, res)
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '用户名已存在'
                })
            )
        })

        it('should register successfully', async () => {
            req.body = { username: 'newuser', password: '123456', realName: 'New User' }
            pool.execute.mockResolvedValueOnce([[]]) // no existing user
            pool.execute.mockResolvedValueOnce([{ insertId: 123 }])
            bcrypt.hash.mockResolvedValue('hashed_password')
            await authController.register(req, res)
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 201,
                    msg: '注册成功'
                })
            )
        })
    })

    describe('login', () => {
        it('should return 400 if username or password missing', async () => {
            req.body = { username: 'test' } // missing password
            await authController.login(req, res)
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '请输入用户名和密码'
                })
            )
        })

        it('should return 401 if user not found', async () => {
            req.body = { username: 'unknown', password: '123456' }
            pool.execute.mockResolvedValueOnce([[]])
            await authController.login(req, res)
            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 401,
                    msg: '用户名或密码错误'
                })
            )
        })

        it('should return 401 if password is incorrect', async () => {
            req.body = { username: 'admin', password: 'wrongpassword' }
            pool.execute.mockResolvedValueOnce([
                [
                    {
                        id: 1,
                        username: 'admin',
                        password: 'hashed',
                        real_name: 'Admin',
                        role: 'admin'
                    }
                ]
            ])
            bcrypt.compare.mockResolvedValue(false)
            await authController.login(req, res)
            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 401,
                    msg: '用户名或密码错误'
                })
            )
        })

        it('should login successfully', async () => {
            req.body = { username: 'admin', password: '123456' }
            const user = {
                id: 1,
                username: 'admin',
                password: 'hashed',
                real_name: 'Admin',
                role: 'admin'
            }
            pool.execute.mockResolvedValueOnce([[user]])
            bcrypt.compare.mockResolvedValue(true)
            jwt.sign.mockReturnValue('fake-token')
            await authController.login(req, res)
            // 验证返回的 JSON 内容，不检查 res.status（因为默认 200）
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    msg: '登录成功',
                    data: expect.objectContaining({
                        token: 'fake-token',
                        user: expect.objectContaining({
                            id: 1,
                            username: 'admin',
                            realName: 'Admin',
                            role: 'admin'
                        })
                    })
                })
            )
        })
    })

    describe('getMe', () => {
        it('should return user info', async () => {
            req.user = { id: 1 }
            pool.execute.mockResolvedValueOnce([
                [
                    {
                        id: 1,
                        username: 'admin',
                        real_name: 'Admin',
                        role: 'admin',
                        created_at: '2026-01-01'
                    }
                ]
            ])
            await authController.getMe(req, res)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        id: 1,
                        username: 'admin'
                    })
                })
            )
        })
    })
})
