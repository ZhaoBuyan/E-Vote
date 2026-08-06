// tests/pollController.test.js
// 在 pollController.test.js 顶部添加
jest.mock('node-schedule', () => ({
    scheduleJob: jest.fn()
}))
const pollController = require('../controllers/pollController')

jest.mock('../config/db', () => ({
    query: jest.fn(),
    execute: jest.fn(),
    getConnection: jest.fn()
}))

const pool = require('../config/db')

describe('pollController', () => {
    let req, res

    beforeEach(() => {
        req = { query: {}, params: {}, body: {}, user: { id: 1, role: 'user' } }
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        jest.clearAllMocks()
    })

    describe('getPolls', () => {
        it('should return polls list', async () => {
            req.query = { status: 'active', page: 1, pageSize: 10 }
            const rows = [{ id: 1, title: 'Test Poll' }]
            pool.query.mockResolvedValueOnce([[{ total: 1 }]])
            pool.query.mockResolvedValueOnce([rows])
            await pollController.getPolls(req, res)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        list: rows,
                        total: 1,
                        page: 1,
                        pageSize: 10
                    })
                })
            )
        })
    })

    describe('getPollById', () => {
        it('should return 404 if poll not found', async () => {
            req.params = { id: 999 }
            pool.query.mockResolvedValueOnce([[]])
            await pollController.getPollById(req, res)
            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 404,
                    msg: '投票不存在'
                })
            )
        })

        it('should return poll with options', async () => {
            req.params = { id: 1 }
            const poll = { id: 1, title: 'Test Poll', description: 'Desc' }
            const options = [{ id: 1, option_text: 'Option A' }]
            pool.query.mockResolvedValueOnce([[poll]])
            pool.query.mockResolvedValueOnce([options])
            await pollController.getPollById(req, res)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        id: 1,
                        title: 'Test Poll',
                        options: options
                    })
                })
            )
        })
    })

    describe('createPoll', () => {
        it('should return 400 if title or options missing', async () => {
            req.body = { description: 'Desc' }
            await pollController.createPoll(req, res)
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '请填写标题并至少添加2个选项'
                })
            )
        })

        it('should create poll successfully', async () => {
            req.body = { title: 'Test', options: ['A', 'B'] }
            const conn = {
                beginTransaction: jest.fn(),
                query: jest.fn(),
                commit: jest.fn(),
                rollback: jest.fn(),
                release: jest.fn()
            }
            pool.getConnection.mockResolvedValue(conn)
            conn.query.mockResolvedValueOnce([{ insertId: 1 }]) // insert polls
            conn.query.mockResolvedValueOnce([{ insertId: 1 }]) // insert options
            await pollController.createPoll(req, res)
            expect(conn.commit).toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(201)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 201,
                    msg: '投票创建成功'
                })
            )
        })
    })

    describe('deletePoll', () => {
        it('should delete poll successfully for owner', async () => {
            req.params = { id: 1 }
            req.user = { id: 1, role: 'user' }
            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])
            await pollController.deletePoll(req, res)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    msg: '投票删除成功'
                })
            )
        })

        it('should return 404 if not found or no permission', async () => {
            req.params = { id: 1 }
            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }])
            await pollController.deletePoll(req, res)
            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 404,
                    msg: '投票不存在或无权限删除'
                })
            )
        })
    })
    describe('updatePoll', () => {
        it('should return 400 if status is invalid', async () => {
            req.params = { id: '1' }
            req.user = { id: 1, role: 'user' }
            req.body = {
                title: 'Updated Poll',
                description: 'Updated Description',
                type: 'single',
                status: 'invalid_status' // 非法状态
            }

            await pollController.updatePoll(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: '状态值无效，必须是 draft/active/closed'
                })
            )
        })

        it('should return 404 if poll not found or user not owner', async () => {
            req.params = { id: '1' }
            req.user = { id: 2, role: 'user' }
            req.body = {
                title: 'Updated Poll',
                description: 'Updated Description',
                type: 'single',
                status: 'active'
            }

            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }])

            await pollController.updatePoll(req, res)

            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 404,
                    msg: '投票不存在或无权限修改'
                })
            )
        })

        it('should update poll successfully for owner', async () => {
            req.params = { id: '1' }
            req.user = { id: 1, role: 'user' }
            req.body = {
                title: 'Updated Poll',
                description: 'Updated Description',
                type: 'single',
                status: 'active',
                endTime: '2026-12-31T23:59:59.000Z',
                isAnonymous: false,
                maxChoices: 0
            }

            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

            await pollController.updatePoll(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    msg: '投票更新成功'
                })
            )
        })

        it('should update poll with maxChoices', async () => {
            req.params = { id: '1' }
            req.user = { id: 1, role: 'user' }
            req.body = {
                title: 'Updated Poll',
                description: 'Updated Description',
                type: 'multi',
                status: 'active',
                maxChoices: 3
            }

            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

            await pollController.updatePoll(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    msg: '投票更新成功'
                })
            )
        })
    })
    describe('getMyPolls', () => {
        it('should return empty list if user has no polls', async () => {
            req.user = { id: 1 }
            req.query = { page: 1, pageSize: 10 }

            pool.query.mockResolvedValueOnce([[{ total: 0 }]]) // count
            pool.query.mockResolvedValueOnce([[]]) // list

            await pollController.getMyPolls(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        list: [],
                        total: 0,
                        page: 1,
                        pageSize: 10,
                        totalPages: 0
                    })
                })
            )
        })

        it('should return polls created by the user', async () => {
            req.user = { id: 1 }
            req.query = { page: 1, pageSize: 10 }

            const mockPolls = [
                { id: 1, title: 'My Poll 1', status: 'active', vote_count: 5 },
                { id: 2, title: 'My Poll 2', status: 'closed', vote_count: 10 }
            ]

            pool.query.mockResolvedValueOnce([[{ total: 2 }]]) // count
            pool.query.mockResolvedValueOnce([mockPolls]) // list

            await pollController.getMyPolls(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        list: mockPolls,
                        total: 2,
                        page: 1,
                        pageSize: 10,
                        totalPages: 1
                    })
                })
            )
        })

        it('should handle pagination correctly', async () => {
            req.user = { id: 1 }
            req.query = { page: 2, pageSize: 5 }

            const mockPolls = [{ id: 6, title: 'My Poll 6', status: 'active', vote_count: 2 }]

            pool.query.mockResolvedValueOnce([[{ total: 6 }]]) // count
            pool.query.mockResolvedValueOnce([mockPolls]) // list (offset 5, limit 5)

            await pollController.getMyPolls(req, res)

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT ? OFFSET ?'),
                [1, 5, 5] // userId, limit, offset
            )

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        list: mockPolls,
                        total: 6,
                        page: 2,
                        pageSize: 5,
                        totalPages: 2
                    })
                })
            )
        })
    })
    describe('getPollById - 补充场景', () => {
        it('should return poll with empty options if no options exist', async () => {
            req.params = { id: '1' }
            const poll = { id: 1, title: 'Test Poll', description: 'Desc' }
            pool.query.mockResolvedValueOnce([[poll]]) // poll exists
            pool.query.mockResolvedValueOnce([[]]) // no options

            await pollController.getPollById(req, res)

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    data: expect.objectContaining({
                        id: 1,
                        title: 'Test Poll',
                        options: []
                    })
                })
            )
        })
    })

    describe('getPolls - 补充场景', () => {
        it('should handle database error', async () => {
            req.query = { status: 'active' }
            pool.query.mockRejectedValueOnce(new Error('DB error'))

            await pollController.getPolls(req, res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 500,
                    msg: '服务器错误'
                })
            )
        })
    })

    describe('updatePoll - 补充场景', () => {
        it('should return 400 if maxChoices is negative', async () => {
            req.params = { id: '1' }
            req.user = { id: 1, role: 'user' }
            req.body = {
                title: 'Test',
                description: 'Desc',
                type: 'multi',
                status: 'active',
                maxChoices: -1 // 负数
            }

            await pollController.updatePoll(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 400,
                    msg: 'maxChoices 不能为负数'
                })
            )
        })
    })

    describe('deletePoll - 补充场景', () => {
        it('should delete poll for admin without created_by check', async () => {
            req.params = { id: '1' }
            req.user = { id: 1, role: 'admin' } // 管理员

            pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])

            await pollController.deletePoll(req, res)

            // 验证 SQL 中没有 created_by 条件
            expect(pool.query).toHaveBeenCalledWith('DELETE FROM polls WHERE id = ?', ['1'])
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 200,
                    msg: '投票删除成功'
                })
            )
        })

        it('should return 404 if admin tries to delete non-existent poll', async () => {
            req.params = { id: '999' }
            req.user = { id: 1, role: 'admin' }

            pool.query.mockResolvedValueOnce([{ affectedRows: 0 }])

            await pollController.deletePoll(req, res)

            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 404,
                    msg: '投票不存在或无权限删除'
                })
            )
        })
    })

    describe('getMyPolls - 补充场景', () => {
        it('should handle database error', async () => {
            req.user = { id: 1 }
            req.query = { page: 1, pageSize: 10 }

            pool.query.mockRejectedValueOnce(new Error('DB error'))

            await pollController.getMyPolls(req, res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 500,
                    msg: '服务器错误'
                })
            )
        })
    })
})
