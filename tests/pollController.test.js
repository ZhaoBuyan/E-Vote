// tests/pollController.test.js
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
})
