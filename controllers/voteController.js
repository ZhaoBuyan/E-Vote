const pool = require('../config/db');

async function checkVoted(req, res) {
    const { id: pollId } = req.params;
    const userId = req.user.id;

    try {
        const [rows] = await pool.execute(
            'SELECT id FROM votes WHERE poll_id = ? AND user_id = ?',
            [pollId, userId]
        );

        res.json({
            code: 200,
            data: {
                hasVoted: rows.length > 0
            }
        });
    } catch (err) {
        console.error('检查投票状态错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

async function submitVote(req, res) {
    const { id: pollId } = req.params;
    const { optionIds } = req.body;
    const userId = req.user.id;
    const ip = req.ip || req.connection.remoteAddress;

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
        return res.status(400).json({
            code: 400,
            msg: '请至少选择一个选项'
        });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 检查投票是否存在且有效
        const [polls] = await conn.execute(
            'SELECT id, type, status FROM polls WHERE id = ? AND status = "active"',
            [pollId]
        );

        if (polls.length === 0) {
            await conn.rollback();
            return res.status(400).json({
                code: 400,
                msg: '投票不存在或已关闭'
            });
        }

        const poll = polls[0];

        // 多选检查：是否超过限制
        if (poll.type === 'single' && optionIds.length > 1) {
            await conn.rollback();
            return res.status(400).json({
                code: 400,
                msg: '该投票为单选，只能选择一个选项'
            });
        }

        // 检查选项是否属于该投票
        const placeholders = optionIds.map(() => '?').join(',');
        const [options] = await conn.execute(
            `SELECT id FROM options WHERE poll_id = ? AND id IN (${placeholders})`,
            [pollId, ...optionIds]
        );

        if (options.length !== optionIds.length) {
            await conn.rollback();
            return res.status(400).json({
                code: 400,
                msg: '存在无效的选项'
            });
        }

        // 检查是否已投票（防刷票）
        const [existing] = await conn.execute(
            'SELECT id FROM votes WHERE poll_id = ? AND user_id = ?',
            [pollId, userId]
        );

        if (existing.length > 0) {
            await conn.rollback();
            return res.status(400).json({
                code: 400,
                msg: '您已投过票，不能重复投票'
            });
        }

        // 插入投票记录
        for (const optionId of optionIds) {
            await conn.execute(
                'INSERT INTO votes (poll_id, option_id, user_id, ip_address) VALUES (?, ?, ?, ?)',
                [pollId, optionId, userId, ip]
            );
        }

        await conn.commit();

        res.status(201).json({
            code: 201,
            msg: '投票成功',
            data: {
                pollId: pollId,
                optionIds: optionIds
            }
        });
    } catch (err) {
        await conn.rollback();
        console.error('投票错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    } finally {
        conn.release();
    }
}

async function getResults(req, res) {
    const { id: pollId } = req.params;

    try {
        // 获取投票基本信息
        const [polls] = await pool.execute(
            'SELECT title, type FROM polls WHERE id = ?',
            [pollId]
        );

        if (polls.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在'
            });
        }

        // 获取各选项得票数
        const [results] = await pool.execute(
            `SELECT o.id, o.option_text,
                    COUNT(v.id) as vote_count
             FROM options o
             LEFT JOIN votes v ON o.id = v.option_id
             WHERE o.poll_id = ?
             GROUP BY o.id, o.option_text
             ORDER BY o.sort_order ASC`,
            [pollId]
        );

        // 获取总投票人数（去重）
        const [totalResult] = await pool.execute(
            'SELECT COUNT(DISTINCT user_id) as total_voters FROM votes WHERE poll_id = ?',
            [pollId]
        );

        const totalVoters = totalResult[0].total_voters;

        // 计算百分比
        const optionsWithPercent = results.map(opt => ({
            id: opt.id,
            text: opt.option_text,
            count: opt.vote_count,
            percentage: totalVoters > 0
                ? Math.round((opt.vote_count / totalVoters) * 100 * 10) / 10
                : 0
        }));

        res.json({
            code: 200,
            data: {
                title: polls[0].title,
                type: polls[0].type,
                totalVoters: totalVoters,
                options: optionsWithPercent
            }
        });
    } catch (err) {
        console.error('获取投票结果错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

module.exports = {
    checkVoted,
    submitVote,
    getResults
};