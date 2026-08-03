// tests/aiController.test.js
const request = require('supertest')
const express = require('express')

// 模拟 authMiddleware
jest.mock('../middleware/auth', () => ({
    authMiddleware: jest.fn((req, res, next) => {
        req.user = { id: 1, username: 'testuser', role: 'user' }
        next()
    })
}))

// 模拟 Redis
jest.mock('../config/redis', () => ({
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn()
}))

// 准备一个可变的 mockCreate
const mockCreate = jest.fn().mockResolvedValue({
    choices: [
        {
            message: {
                content: JSON.stringify({
                    title: 'AI Test Title',
                    description: 'AI Test Description',
                    options: ['Option A', 'Option B', 'Option C', 'Option D']
                })
            }
        }
    ]
})

// 模拟 OpenAI
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockCreate
            }
        }
    }))
})

const redisClient = require('../config/redis')
const app = express()
app.use(express.json())

const aiRoutes = require('../routes/ai')
app.use('/api/ai', aiRoutes)

describe('aiController', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // 重置 mockCreate 为默认成功
        mockCreate.mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            title: 'AI Test Title',
                            description: 'AI Test Description',
                            options: ['Option A', 'Option B', 'Option C', 'Option D']
                        })
                    }
                }
            ]
        })
    })

    jest.setTimeout(10000)

    it('should return 400 if no topic', async () => {
        const res = await request(app).post('/api/ai/generate-poll').send({})
        expect(res.status).toBe(400)
        expect(res.body).toMatchObject({ code: 400, msg: '请先输入投票主题或标题' })
    })

    it('should return 429 if rate limited', async () => {
        redisClient.get.mockResolvedValue('10')
        const res = await request(app).post('/api/ai/generate-poll').send({ topic: 'test' })
        expect(res.status).toBe(429)
        expect(res.body).toMatchObject({
            code: 429,
            msg: '今日生成次数已达上限（10次），请明天再试'
        })
    })

    it('should generate poll successfully', async () => {
        redisClient.get.mockResolvedValue(null)
        redisClient.incr.mockResolvedValue(1)
        redisClient.expire.mockResolvedValue(1)
        const res = await request(app).post('/api/ai/generate-poll').send({ topic: 'test topic' })
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
            code: 200,
            msg: '生成成功',
            data: {
                title: expect.any(String),
                description: expect.any(String),
                options: expect.any(Array)
            }
        })
    })

    it('should fallback to mock if OpenAI fails', async () => {
        redisClient.get.mockResolvedValue(null)
        redisClient.incr.mockResolvedValue(1)
        redisClient.expire.mockResolvedValue(1)
        // 让 openai 调用失败
        mockCreate.mockRejectedValueOnce(new Error('API error'))

        const res = await request(app).post('/api/ai/generate-poll').send({ topic: 'test topic' })
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({
            code: 200,
            msg: expect.stringContaining('示例数据填充'),
            _mock: true
        })
    })
})
