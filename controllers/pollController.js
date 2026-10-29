const pool = require('../config/db')
const schedule = require('node-schedule')

const VALID_TYPES = ['single', 'multi']
const VALID_STATUSES = ['draft', 'active', 'closed']

// 定时任务：每天凌晨2点检查并关闭过期投票
schedule.scheduleJob('0 2 * * *', async function () {
    try {
        const [result] = await pool.query(
            "UPDATE polls SET status = 'closed' WHERE status = 'active' AND end_time < NOW()"
        )
        if (result.affectedRows > 0) {
            console.log(`⏰ 自动关闭了 ${result.affectedRows} 个过期投票`)
        }
    } catch (err) {
        console.error('定时任务执行失败:', err)
    }
})

function normalizeTitle(value) {
    if (typeof value !== 'string') return null
    const title = value.trim()
    if (!title || title.length > 200) return null
    return title
}

function normalizeDescription(value) {
    if (value === null || value === undefined) return null
    if (typeof value !== 'string') return undefined
    const description = value.trim()
    if (description.length > 2000) return undefined
    return description || null
}

function normalizeOptions(value) {
    if (!Array.isArray(value) || value.length < 2 || value.length > 20) return null
    const options = []
    for (const item of value) {
        if (typeof item !== 'string') return null
        const text = item.trim()
        if (!text || text.length > 200) return null
        options.push(text)
    }
    return options
}

function parseEndTime(value) {
    if (value === null || value === undefined || value === '') return null
    if (typeof value !== 'string') return undefined
    const endTime = new Date(value)
    if (Number.isNaN(endTime.getTime())) return undefined
    return endTime
}

function parsePage(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 10, 1), 100)
    return { page, pageSize, offset: (page - 1) * pageSize }
}

async function getPolls(req, res) {
    const { status } = req.query
    const { page: pageNum, pageSize: limit, offset } = parsePage(req.query)

    if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
            code: 400,
            msg: '状态值无效，必须是 draft/active/closed'
        })
    }

    let whereClause = 'WHERE 1=1'
    const params = []

    if (status) {
        whereClause += ' AND p.status = ?'
        params.push(status)
    }

    try {
        // 查询总数
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM polls p ${whereClause}`,
            params
        )
        const total = countResult[0].total

        // 查询列表
        const listParams = [...params, limit, offset]
        const [rows] = await pool.query(
            `SELECT p.id, p.title, p.description, p.type, p.status, p.end_time, p.created_at,
                    u.username as creator_name,
                    (SELECT COUNT(*) FROM vote_submissions vs WHERE vs.poll_id = p.id) as vote_count,
                    (SELECT COUNT(*) FROM options o WHERE o.poll_id = p.id) as option_count
             FROM polls p
             LEFT JOIN users u ON p.created_by = u.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            listParams
        )

        res.json({
            code: 200,
            data: {
                list: rows,
                total,
                page: pageNum,
                pageSize: limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        console.error('❌ 获取投票列表错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

async function getPollById(req, res) {
    const { id } = req.params

    try {
        const [polls] = await pool.query(
            `SELECT p.*, u.username as creator_name
             FROM polls p
             LEFT JOIN users u ON p.created_by = u.id
             WHERE p.id = ?`,
            [id]
        )

        if (polls.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在'
            })
        }

        const [options] = await pool.query(
            `SELECT id, option_text, sort_order
             FROM options
             WHERE poll_id = ?
             ORDER BY sort_order ASC`,
            [id]
        )

        const poll = polls[0]
        poll.options = options

        res.json({
            code: 200,
            data: poll
        })
    } catch (err) {
        console.error('获取投票详情错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

async function createPoll(req, res) {
    const body = req.body || {}
    const { title, description, type, options, endTime, isAnonymous } = body

    const cleanTitle = normalizeTitle(title)
    const cleanOptions = normalizeOptions(options)
    const cleanDescription = normalizeDescription(description)
    const cleanType = type === undefined ? 'single' : type

    if (!cleanTitle || !cleanOptions || cleanDescription === undefined) {
        return res.status(400).json({
            code: 400,
            msg: '请填写 1-200 字标题和 2-20 个非空选项'
        })
    }

    if (!VALID_TYPES.includes(cleanType)) {
        return res.status(400).json({
            code: 400,
            msg: '投票类型必须是 single 或 multi'
        })
    }

    if (isAnonymous !== undefined && typeof isAnonymous !== 'boolean') {
        return res.status(400).json({
            code: 400,
            msg: 'isAnonymous 必须是布尔值'
        })
    }

    const parsedEndTime = parseEndTime(endTime)
    if (parsedEndTime === undefined) {
        return res.status(400).json({
            code: 400,
            msg: '截止时间格式无效'
        })
    }
    if (parsedEndTime && parsedEndTime.getTime() <= Date.now()) {
        return res.status(400).json({
            code: 400,
            msg: '截止时间必须晚于当前时间'
        })
    }

    let maxChoicesNum = 0
    if (cleanType === 'multi' && body.maxChoices !== undefined && body.maxChoices !== '') {
        const parsedMaxChoices = Number(body.maxChoices)
        if (!Number.isInteger(parsedMaxChoices) || parsedMaxChoices < 0) {
            return res.status(400).json({
                code: 400,
                msg: '最多可选数必须是非负整数'
            })
        }
        maxChoicesNum = parsedMaxChoices
    }
    if (maxChoicesNum > cleanOptions.length) {
        return res.status(400).json({
            code: 400,
            msg: '最多可选数必须在 0 到选项数量之间'
        })
    }

    let conn
    try {
        conn = await pool.getConnection()
        await conn.beginTransaction()

        const [result] = await conn.query(
            `INSERT INTO polls (title, description, type, status, end_time, is_anonymous, created_by, max_choices)
            VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
            [
                cleanTitle,
                cleanDescription,
                cleanType,
                parsedEndTime,
                isAnonymous === true,
                req.user.id,
                maxChoicesNum
            ]
        )

        const pollId = result.insertId

        for (let i = 0; i < cleanOptions.length; i++) {
            await conn.query(
                'INSERT INTO options (poll_id, option_text, sort_order) VALUES (?, ?, ?)',
                [pollId, cleanOptions[i], i + 1]
            )
        }

        await conn.commit()

        res.status(201).json({
            code: 201,
            msg: '投票创建成功',
            data: { id: pollId }
        })
    } catch (err) {
        if (conn) {
            try {
                await conn.rollback()
            } catch (rollbackErr) {
                console.error('创建投票回滚失败:', rollbackErr)
            }
        }
        console.error('创建投票错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    } finally {
        if (conn) conn.release()
    }
}

async function updatePoll(req, res) {
    const { id } = req.params
    const body = req.body || {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    try {
        const [polls] = await pool.query(
            `SELECT id, title, description, type, status, end_time, is_anonymous, max_choices
             FROM polls
             WHERE id = ? AND created_by = ?`,
            [id, req.user.id]
        )

        if (polls.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在或无权限修改'
            })
        }

        const current = polls[0]
        const next = {
            title: current.title,
            description: current.description,
            type: current.type,
            status: current.status,
            end_time: current.end_time,
            is_anonymous: Boolean(current.is_anonymous),
            max_choices: current.max_choices
        }

        if (has('title')) {
            const title = normalizeTitle(body.title)
            if (!title) {
                return res.status(400).json({ code: 400, msg: '标题必须为 1-200 字' })
            }
            next.title = title
        }

        if (has('description')) {
            const description = normalizeDescription(body.description)
            if (description === undefined) {
                return res.status(400).json({ code: 400, msg: '说明格式无效或超过 2000 字' })
            }
            next.description = description
        }

        if (has('type')) {
            if (!VALID_TYPES.includes(body.type)) {
                return res.status(400).json({ code: 400, msg: '投票类型必须是 single 或 multi' })
            }
            next.type = body.type
        }

        if (has('status')) {
            if (!VALID_STATUSES.includes(body.status)) {
                return res.status(400).json({
                    code: 400,
                    msg: '状态值无效，必须是 draft/active/closed'
                })
            }
            next.status = body.status
        }

        if (has('maxChoices')) {
            const maxChoices = parseInt(body.maxChoices, 10)
            if (!Number.isInteger(maxChoices) || maxChoices < 0 || maxChoices > 100) {
                return res.status(400).json({ code: 400, msg: 'maxChoices 必须是 0-100 的整数' })
            }
            next.max_choices = maxChoices
        }

        if (next.type === 'single') {
            next.max_choices = 0
        }

        if (has('endTime')) {
            const endTime = parseEndTime(body.endTime)
            if (endTime === undefined) {
                return res.status(400).json({ code: 400, msg: '截止时间格式无效' })
            }
            next.end_time = endTime
        }

        if (has('isAnonymous')) {
            if (typeof body.isAnonymous !== 'boolean') {
                return res.status(400).json({ code: 400, msg: 'isAnonymous 必须是布尔值' })
            }
            next.is_anonymous = body.isAnonymous
        }

        await pool.query(
            `UPDATE polls
             SET title = ?, description = ?, type = ?, status = ?, end_time = ?, is_anonymous = ?, max_choices = ?
             WHERE id = ? AND created_by = ?`,
            [
                next.title,
                next.description,
                next.type,
                next.status,
                next.end_time,
                next.is_anonymous,
                next.max_choices,
                id,
                req.user.id
            ]
        )

        res.json({
            code: 200,
            msg: '投票更新成功'
        })
    } catch (err) {
        console.error('更新投票错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

async function deletePoll(req, res) {
    const { id } = req.params
    const isAdmin = req.user.role === 'admin'

    try {
        let query, params
        if (isAdmin) {
            // 管理员：可以删除任何人的投票
            query = 'DELETE FROM polls WHERE id = ?'
            params = [id]
        } else {
            // 普通用户：只能删除自己创建的投票
            query = 'DELETE FROM polls WHERE id = ? AND created_by = ?'
            params = [id, req.user.id]
        }

        const [result] = await pool.query(query, params)

        if (result.affectedRows === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在或无权限删除'
            })
        }

        res.json({
            code: 200,
            msg: '投票删除成功'
        })
    } catch (err) {
        console.error('删除投票错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

async function getMyPolls(req, res) {
    const { page: pageNum, pageSize: limit, offset } = parsePage(req.query)

    try {
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM polls WHERE created_by = ?',
            [req.user.id]
        )
        const total = countResult[0].total

        const [rows] = await pool.query(
            `SELECT p.id, p.title, p.type, p.status, p.end_time, p.created_at,
                    (SELECT COUNT(*) FROM vote_submissions vs WHERE vs.poll_id = p.id) as vote_count
             FROM polls p
             WHERE p.created_by = ?
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [req.user.id, limit, offset]
        )

        res.json({
            code: 200,
            data: {
                list: rows,
                total,
                page: pageNum,
                pageSize: limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        console.error('获取我的投票列表错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

module.exports = {
    getPolls,
    getPollById,
    createPoll,
    updatePoll,
    deletePoll,
    getMyPolls
}
