// controllers/voteController.js
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const redisClient = require('../config/redis')
const pool = require('../config/db')

function clientIp(req) {
    return req.ip || req.socket?.remoteAddress || ''
}

// Excel 会把以 = + - @ 开头的单元格当公式执行，导出时加单引号转义
function csvSafe(value) {
    const text = String(value ?? '')
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

async function checkVoted(req, res) {
    const { id: pollId } = req.params
    const userId = req.user.id

    try {
        const [rows] = await pool.execute(
            'SELECT id FROM vote_submissions WHERE poll_id = ? AND user_id = ?',
            [pollId, userId]
        )

        res.json({
            code: 200,
            data: {
                hasVoted: rows.length > 0
            }
        })
    } catch (err) {
        console.error('检查投票状态错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

async function submitVote(req, res) {
    const { id: pollId } = req.params
    const rawOptionIds = req.body && req.body.optionIds
    const userId = req.user.id

    if (
        !Array.isArray(rawOptionIds) ||
        rawOptionIds.length === 0 ||
        rawOptionIds.length > 100 ||
        !rawOptionIds.every(Number.isInteger)
    ) {
        return res.status(400).json({
            code: 400,
            msg: '请至少选择一个有效选项'
        })
    }

    const optionIds = [...new Set(rawOptionIds)]
    if (optionIds.length !== rawOptionIds.length) {
        return res.status(400).json({
            code: 400,
            msg: '不能重复选择同一选项'
        })
    }

    let conn
    try {
        conn = await pool.getConnection()
        await conn.beginTransaction()

        // FOR UPDATE 让同一投票的提交串行化，避免并发重复投票
        const [polls] = await conn.execute(
            `SELECT id, type, max_choices
             FROM polls
             WHERE id = ? AND status = 'active'
               AND (end_time IS NULL OR end_time > NOW())
             FOR UPDATE`,
            [pollId]
        )

        if (polls.length === 0) {
            await conn.rollback()
            return res.status(400).json({
                code: 400,
                msg: '投票不存在或已结束'
            })
        }

        const poll = polls[0]

        if (poll.type === 'single' && optionIds.length > 1) {
            await conn.rollback()
            return res.status(400).json({
                code: 400,
                msg: '该投票为单选，只能选择一个选项'
            })
        }

        if (poll.type === 'multi' && poll.max_choices > 0 && optionIds.length > poll.max_choices) {
            await conn.rollback()
            return res.status(400).json({
                code: 400,
                msg: `最多只能选择 ${poll.max_choices} 个选项`
            })
        }

        const placeholders = optionIds.map(() => '?').join(',')
        const [options] = await conn.execute(
            `SELECT id FROM options WHERE poll_id = ? AND id IN (${placeholders})`,
            [pollId, ...optionIds]
        )

        if (options.length !== optionIds.length) {
            await conn.rollback()
            return res.status(400).json({
                code: 400,
                msg: '存在无效的选项'
            })
        }

        const [existing] = await conn.execute(
            'SELECT id FROM vote_submissions WHERE poll_id = ? AND user_id = ?',
            [pollId, userId]
        )

        if (existing.length > 0) {
            await conn.rollback()
            return res.status(400).json({
                code: 400,
                msg: '您已投过票，不能重复投票'
            })
        }

        const [submission] = await conn.execute(
            'INSERT INTO vote_submissions (poll_id, user_id, ip_address) VALUES (?, ?, ?)',
            [pollId, userId, clientIp(req)]
        )

        for (const optionId of optionIds) {
            await conn.execute(
                'INSERT INTO vote_choices (submission_id, option_id) VALUES (?, ?)',
                [submission.insertId, optionId]
            )
        }

        await conn.commit()

        // 广播 WebSocket 更新（独立 try-catch，失败不影响投票结果）
        try {
            const io = req.app.get('io')
            if (io) {
                const [results] = await pool.execute(
                    `SELECT o.id, o.option_text, COUNT(vs.id) AS vote_count
                     FROM options o
                     LEFT JOIN vote_choices vc ON o.id = vc.option_id
                     LEFT JOIN vote_submissions vs
                         ON vc.submission_id = vs.id AND vs.poll_id = o.poll_id
                     WHERE o.poll_id = ?
                     GROUP BY o.id, o.option_text
                     ORDER BY o.sort_order ASC`,
                    [pollId]
                )

                const [totalResult] = await pool.execute(
                    'SELECT COUNT(*) AS total_voters FROM vote_submissions WHERE poll_id = ?',
                    [pollId]
                )

                const totalVoters = totalResult[0].total_voters
                const optionsWithPercent = results.map((opt) => ({
                    id: opt.id,
                    text: opt.option_text,
                    count: opt.vote_count,
                    percentage:
                        totalVoters > 0
                            ? Math.round((opt.vote_count / totalVoters) * 100 * 10) / 10
                            : 0
                }))

                io.to(`poll-${pollId}`).emit('vote-update', {
                    totalVoters,
                    options: optionsWithPercent
                })
            }
        } catch (broadcastErr) {
            console.warn('⚠️ 广播失败:', broadcastErr.message)
        }

        // 清除缓存（失败不影响投票结果）
        try {
            await redisClient.del(`poll:${pollId}:results`)
        } catch (cacheErr) {
            console.warn('⚠️ 清除缓存失败:', cacheErr.message)
        }

        return res.status(201).json({
            code: 201,
            msg: '投票成功',
            data: {
                pollId,
                optionIds
            }
        })
    } catch (err) {
        if (conn) {
            try {
                await conn.rollback()
            } catch (rollbackErr) {
                console.error('投票回滚失败:', rollbackErr)
            }
        }
        console.error('投票错误:', err)
        return res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    } finally {
        if (conn) conn.release()
    }
}

async function getResults(req, res) {
    const { id: pollId } = req.params
    const cacheKey = `poll:${pollId}:results`

    let cached = null
    try {
        cached = await redisClient.get(cacheKey)
    } catch (cacheErr) {
        console.warn('⚠️ 读取缓存失败，直接查询数据库:', cacheErr.message)
    }

    if (cached) {
        try {
            return res.json({
                code: 200,
                data: JSON.parse(cached)
            })
        } catch (parseErr) {
            console.warn('⚠️ 缓存数据损坏，忽略缓存:', parseErr.message)
        }
    }

    try {
        const [polls] = await pool.execute(
            'SELECT title, type, max_choices FROM polls WHERE id = ?',
            [pollId]
        )

        if (polls.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在'
            })
        }

        const [results] = await pool.execute(
            `SELECT o.id, o.option_text, COUNT(vs.id) AS vote_count
             FROM options o
             LEFT JOIN vote_choices vc ON o.id = vc.option_id
             LEFT JOIN vote_submissions vs
                 ON vc.submission_id = vs.id AND vs.poll_id = o.poll_id
             WHERE o.poll_id = ?
             GROUP BY o.id, o.option_text
             ORDER BY o.sort_order ASC`,
            [pollId]
        )

        const [totalResult] = await pool.execute(
            'SELECT COUNT(*) AS total_voters FROM vote_submissions WHERE poll_id = ?',
            [pollId]
        )

        const totalVoters = totalResult[0].total_voters
        const optionsWithPercent = results.map((opt) => ({
            id: opt.id,
            text: opt.option_text,
            count: opt.vote_count,
            percentage:
                totalVoters > 0 ? Math.round((opt.vote_count / totalVoters) * 100 * 10) / 10 : 0
        }))

        const data = {
            title: polls[0].title,
            type: polls[0].type,
            maxChoices: polls[0].max_choices || 0,
            totalVoters,
            options: optionsWithPercent
        }

        try {
            await redisClient.set(cacheKey, JSON.stringify(data), { EX: 10 })
        } catch (cacheErr) {
            console.warn('⚠️ 写入缓存失败:', cacheErr.message)
        }

        return res.json({
            code: 200,
            data
        })
    } catch (err) {
        console.error('获取投票结果错误:', err)
        return res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

// 导出投票结果为 CSV
async function exportResults(req, res) {
    const { id: pollId } = req.params
    const safePollId = String(pollId).replace(/[^\w-]/g, '')

    try {
        const [polls] = await pool.execute('SELECT title FROM polls WHERE id = ?', [pollId])
        if (polls.length === 0) {
            return res.status(404).json({ code: 404, msg: '投票不存在' })
        }

        const [results] = await pool.execute(
            `SELECT o.id, o.option_text, COUNT(vs.id) AS vote_count
             FROM options o
             LEFT JOIN vote_choices vc ON o.id = vc.option_id
             LEFT JOIN vote_submissions vs
                 ON vc.submission_id = vs.id AND vs.poll_id = o.poll_id
             WHERE o.poll_id = ?
             GROUP BY o.id, o.option_text
             ORDER BY o.sort_order ASC`,
            [pollId]
        )

        const [totalResult] = await pool.execute(
            'SELECT COUNT(*) AS total_voters FROM vote_submissions WHERE poll_id = ?',
            [pollId]
        )
        const totalVoters = totalResult[0].total_voters

        const data = results.map((opt) => ({
            选项ID: opt.id,
            选项文字: csvSafe(opt.option_text),
            得票数: opt.vote_count,
            '百分比(%)':
                totalVoters > 0
                    ? (Math.round((opt.vote_count / totalVoters) * 100 * 10) / 10).toFixed(1)
                    : '0.0'
        }))

        const date = new Date().toISOString().slice(0, 10)
        const tempDir = path.join(__dirname, '../temp')
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
        }
        // 临时文件名不包含用户可控内容，避免路径穿越和并发覆盖
        const filePath = path.join(tempDir, `poll-${safePollId}-${crypto.randomUUID()}.csv`)

        const csvWriter = createCsvWriter({
            path: filePath,
            header: [
                { id: '选项ID', title: '选项ID' },
                { id: '选项文字', title: '选项文字' },
                { id: '得票数', title: '得票数' },
                { id: '百分比(%)', title: '百分比(%)' }
            ]
        })

        await csvWriter.writeRecords(data)

        // 下载文件名使用安全标题，并通过 RFC 5987 传递 UTF-8 名称
        const safeTitle = polls[0].title
            .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
            .trim()
            .slice(0, 40)
        const downloadName = `投票结果_${safeTitle || safePollId}_${date}.csv`

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="poll-${safePollId}.csv"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
        )
        res.sendFile(filePath, (err) => {
            fs.unlink(filePath, () => {})
            if (err && !res.headersSent) {
                console.error('发送CSV文件失败:', err.message)
                res.status(500).json({ code: 500, msg: '导出失败' })
            }
        })
    } catch (err) {
        console.error('导出投票结果错误:', err)
        res.status(500).json({ code: 500, msg: '服务器错误' })
    }
}

module.exports = {
    checkVoted,
    submitVote,
    getResults,
    exportResults
}
