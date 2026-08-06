// controllers/voteController.js
const redisClient = require('../config/redis')
const pool = require('../config/db')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const path = require('path')
const fs = require('fs')

async function checkVoted(req, res) {
    const { id: pollId } = req.params
    const userId = req.user.id

    try {
        const [rows] = await pool.execute(
            'SELECT id FROM votes WHERE poll_id = ? AND user_id = ?',
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
    const { optionIds } = req.body
    const userId = req.user.id

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
        return res.status(400).json({
            code: 400,
            msg: '请至少选择一个选项'
        })
    }

    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const [polls] = await conn.execute(
            'SELECT id, type, status, max_choices FROM polls WHERE id = ? AND status = "active"',
            [pollId]
        )

        if (polls.length === 0) {
            await conn.rollback()
            return res.status(400).json({
                code: 400,
                msg: '投票不存在或已关闭'
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
            'SELECT id FROM votes WHERE poll_id = ? AND user_id = ?',
            [pollId, userId]
        )

        if (existing.length > 0) {
            await conn.rollback()
            return res.status(400).json({
                code: 400,
                msg: '您已投过票，不能重复投票'
            })
        }

        for (const optionId of optionIds) {
            await conn.execute(
                'INSERT INTO votes (poll_id, option_id, user_id, ip_address) VALUES (?, ?, ?, ?)',
                [pollId, optionId, userId, req.ip || req.connection.remoteAddress]
            )
        }

        await conn.commit()

        // ============================================================
        // 1. 广播 WebSocket 更新（独立 try-catch）
        // ============================================================
        try {
            const io = req.app.get('io')
            if (io) {
                const [results] = await pool.execute(
                    `SELECT o.id, o.option_text, COUNT(v.id) as vote_count
                     FROM options o
                     LEFT JOIN votes v ON o.id = v.option_id
                     WHERE o.poll_id = ?
                     GROUP BY o.id, o.option_text
                     ORDER BY o.sort_order ASC`,
                    [pollId]
                )

                const [totalResult] = await pool.execute(
                    'SELECT COUNT(DISTINCT user_id) as total_voters FROM votes WHERE poll_id = ?',
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
                    totalVoters: totalVoters,
                    options: optionsWithPercent
                })

                console.log(`📡 已广播投票更新: poll-${pollId}`)
            }
        } catch (broadcastErr) {
            console.warn('⚠️ 广播失败:', broadcastErr.message)
        }

        // ============================================================
        // 2. 清除 Redis 缓存（独立 try-catch）
        // ============================================================
        try {
            const cacheKey = `poll:${pollId}:results`
            await redisClient.del(cacheKey)
            console.log(`🗑️ 已清除缓存: ${cacheKey}`)
        } catch (cacheErr) {
            console.warn('⚠️ 清除缓存失败:', cacheErr.message)
        }

        res.status(201).json({
            code: 201,
            msg: '投票成功',
            data: {
                pollId: pollId,
                optionIds: optionIds
            }
        })
    } catch (err) {
        await conn.rollback()
        console.error('投票错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    } finally {
        conn.release()
    }
}

async function getResults(req, res) {
    const { id: pollId } = req.params
    const cacheKey = `poll:${pollId}:results`

    try {
        const cached = await redisClient.get(cacheKey)
        if (cached) {
            return res.json({
                code: 200,
                data: JSON.parse(cached)
            })
        }

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
            `SELECT o.id, o.option_text, COUNT(v.id) as vote_count
             FROM options o
             LEFT JOIN votes v ON o.id = v.option_id
             WHERE o.poll_id = ?
             GROUP BY o.id, o.option_text
             ORDER BY o.sort_order ASC`,
            [pollId]
        )

        const [totalResult] = await pool.execute(
            'SELECT COUNT(DISTINCT user_id) as total_voters FROM votes WHERE poll_id = ?',
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
            totalVoters: totalVoters,
            options: optionsWithPercent
        }

        await redisClient.set(cacheKey, JSON.stringify(data), { EX: 10 })

        res.json({
            code: 200,
            data: data
        })
    } catch (err) {
        console.error('获取投票结果错误:', err)
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        })
    }
}

// 导出投票结果为 CSV
async function exportResults(req, res) {
    const { id: pollId } = req.params

    try {
        const [polls] = await pool.execute('SELECT title FROM polls WHERE id = ?', [pollId])
        if (polls.length === 0) {
            return res.status(404).json({ code: 404, msg: '投票不存在' })
        }

        const [results] = await pool.execute(
            `SELECT o.id, o.option_text, COUNT(v.id) as vote_count
             FROM options o
             LEFT JOIN votes v ON o.id = v.option_id
             WHERE o.poll_id = ?
             GROUP BY o.id, o.option_text
             ORDER BY o.sort_order ASC`,
            [pollId]
        )

        const [totalResult] = await pool.execute(
            'SELECT COUNT(DISTINCT user_id) as total_voters FROM votes WHERE poll_id = ?',
            [pollId]
        )
        const totalVoters = totalResult[0].total_voters

        const data = results.map((opt) => ({
            选项ID: opt.id,
            选项文字: opt.option_text,
            得票数: opt.vote_count,
            '百分比(%)':
                totalVoters > 0
                    ? (Math.round((opt.vote_count / totalVoters) * 100 * 10) / 10).toFixed(1)
                    : '0.0'
        }))

        const fileName = `投票结果_${polls[0].title}_${new Date().toISOString().slice(0, 10)}.csv`
        const tempDir = path.join(__dirname, '../temp')
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
        }
        const filePath = path.join(tempDir, fileName)

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

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`)
        res.sendFile(filePath, (err) => {
            fs.unlink(filePath, () => {})
            if (err) {
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
