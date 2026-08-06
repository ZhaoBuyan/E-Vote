// tests/voteController.test.js
const voteController = require('../controllers/voteController')

// ===== 模拟 Redis =====
jest.mock('../config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    connect: jest.fn()
}))

// ===== 模拟数据库 =====
jest.mock('../config/db', () => ({
    getConnection: jest.fn(),
    execute: jest.fn(),
    query: jest.fn()
}))

const pool = require('../config/db')
const redisClient = require('../config/redis')

describe('voteController', () => {
    let req, res
    let conn

    beforeEach(() => {
        req = {
            params: {},
            body: {},
            user: { id: 1 },
            ip: '127.0.0.1',
            app: {
                get: jest.fn().mockReturnValue({
                    to: jest.fn().mockReturnValue({
                        emit: jest.fn()
                    })
                })
            }
        }
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        conn = {
            beginTransaction: jest.fn(),
            execute: jest.fn(),
            query: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn()
        }
        pool.getConnection.mockResolvedValue(conn)
        jest.clearAllMocks()
    })

    describe('checkVoted', () => {
        it('should return hasVoted: true if vote exists', async () => {
            req.params = { id: '1' }
            pool.execute.mockResolvedValueOnce([[{ id: 1 }]])
            await voteController.checkVoted(req, res)
            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                data: { hasVoted: true }
            })
        })

        it('should return hasVoted: false if no vote', async () => {
            req.params = { id: '1' }
            pool.execute.mockResolvedValueOnce([[]])
            await voteController.checkVoted(req, res)
            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                data: { hasVoted: false }
            })
        })
    })

    describe('submitVote', () => {
        it('should return 400 if no optionIds', async () => {
            req.body = {}
            await voteController.submitVote(req, res)
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '请至少选择一个选项'
                })
            )
        })

        it('should return 400 if poll not active or not found', async () => {
            req.params = { id: '1' }
            req.body = { optionIds: [1] }
            conn.execute.mockResolvedValueOnce([[]])
            await voteController.submitVote(req, res)
            expect(conn.rollback).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '投票不存在或已关闭'
                })
            )
        })

        it('should return 400 if single choice and multiple options', async () => {
            req.params = { id: '1' }
            req.body = { optionIds: [1, 2] }
            conn.execute.mockResolvedValueOnce([
                [{ id: 1, type: 'single', status: 'active', max_choices: 0 }]
            ])
            await voteController.submitVote(req, res)
            expect(conn.rollback).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '该投票为单选，只能选择一个选项'
                })
            )
        })

        it('should return 400 if multi exceeds max_choices', async () => {
            req.params = { id: '1' }
            req.body = { optionIds: [1, 2, 3] }
            conn.execute.mockResolvedValueOnce([
                [{ id: 1, type: 'multi', status: 'active', max_choices: 2 }]
            ])
            await voteController.submitVote(req, res)
            expect(conn.rollback).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '最多只能选择 2 个选项'
                })
            )
        })

        it('should return 400 if invalid options', async () => {
            req.params = { id: '1' }
            req.body = { optionIds: [999] }
            conn.execute.mockResolvedValueOnce([
                [{ id: 1, type: 'single', status: 'active', max_choices: 0 }]
            ])
            conn.execute.mockResolvedValueOnce([[]])
            await voteController.submitVote(req, res)
            expect(conn.rollback).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '存在无效的选项'
                })
            )
        })

        it('should return 400 if already voted', async () => {
            req.params = { id: '1' }
            req.body = { optionIds: [1] }
            conn.execute.mockResolvedValueOnce([
                [{ id: 1, type: 'single', status: 'active', max_choices: 0 }]
            ])
            conn.execute.mockResolvedValueOnce([[{ id: 1 }]])
            conn.execute.mockResolvedValueOnce([[{ id: 1 }]])
            await voteController.submitVote(req, res)
            expect(conn.rollback).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '您已投过票，不能重复投票'
                })
            )
        })

        it('should submit vote successfully', async () => {
            req.params = { id: '1' }
            req.body = { optionIds: [1, 2] }
            const poll = { id: 1, type: 'multi', status: 'active', max_choices: 3 }
            conn.execute
                .mockResolvedValueOnce([[poll]])
                .mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 1 }])
                .mockResolvedValueOnce([{ insertId: 2 }])

            redisClient.del.mockResolvedValue(1)

            await voteController.submitVote(req, res)

            expect(conn.commit).toHaveBeenCalled()
            expect(redisClient.del).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 201,
                    msg: '投票成功'
                })
            )
        })
    })

    describe('getResults', () => {
        it('should return 404 if poll not found', async () => {
            req.params = { id: '1' }
            redisClient.get.mockResolvedValue(null)
            pool.execute.mockResolvedValueOnce([[]])
            await voteController.getResults(req, res)
            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 404,
                    msg: '投票不存在'
                })
            )
        })

        it('should return cached data if Redis hit', async () => {
            req.params = { id: '1' }
            const cachedData = {
                title: 'Cached Poll',
                type: 'single',
                maxChoices: 0,
                totalVoters: 10,
                options: [{ id: 1, text: 'A', count: 5, percentage: 50 }]
            }
            redisClient.get.mockResolvedValue(JSON.stringify(cachedData))

            await voteController.getResults(req, res)

            expect(res.json).toHaveBeenCalledWith({
                code: 200,
                data: cachedData
            })
            expect(pool.execute).not.toHaveBeenCalled()
        })

        it('should return results with options (cache miss)', async () => {
            req.params = { id: '1' }
            const poll = { title: 'Test', type: 'single', max_choices: 0 }

            redisClient.get.mockResolvedValue(null)
            redisClient.set.mockResolvedValue('OK')

            pool.execute
                .mockResolvedValueOnce([[poll]])
                .mockResolvedValueOnce([[{ id: 1, option_text: 'A', vote_count: 3 }]])
                .mockResolvedValueOnce([[{ total_voters: 3 }]])

            await voteController.getResults(req, res)

            expect(redisClient.set).toHaveBeenCalled()
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        title: 'Test',
                        totalVoters: 3,
                        options: expect.arrayContaining([
                            expect.objectContaining({
                                id: 1,
                                text: 'A',
                                count: 3,
                                percentage: 100
                            })
                        ])
                    })
                })
            )
        })
    })
})
