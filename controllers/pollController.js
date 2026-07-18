const pool = require('../config/db');
const schedule = require('node-schedule');

// 定时任务：每天凌晨2点检查并关闭过期投票
schedule.scheduleJob('0 2 * * *', async function() {
    try {
        const [result] = await pool.query(
            "UPDATE polls SET status = 'closed' WHERE status = 'active' AND end_time < NOW()"
        );
        if (result.affectedRows > 0) {
            console.log(`⏰ 自动关闭了 ${result.affectedRows} 个过期投票`);
        }
    } catch (err) {
        console.error('定时任务执行失败:', err);
    }
});

async function getPolls(req, res) {
    const { status, page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
        whereClause += ' AND p.status = ?';
        params.push(status);
    }

    console.log('🔍 whereClause:', whereClause);
    console.log('🔍 params (before count):', params);

    try {
        // 查询总数
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM polls p ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // 查询列表
        const listParams = [...params, limit, offset];
        console.log('🔍 listParams:', listParams);

        const [rows] = await pool.query(
            `SELECT p.id, p.title, p.description, p.type, p.status, p.end_time, p.created_at,
                    u.username as creator_name,
                    (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id) as vote_count,
                    (SELECT COUNT(*) FROM options o WHERE o.poll_id = p.id) as option_count
             FROM polls p
             LEFT JOIN users u ON p.created_by = u.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            listParams
        );

        res.json({
            code: 200,
            data: {
                list: rows,
                total: total,
                page: pageNum,
                pageSize: limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('❌ 获取投票列表错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

async function getPollById(req, res) {
    const { id } = req.params;

    try {
        const [polls] = await pool.query(
            `SELECT p.*, u.username as creator_name
             FROM polls p
             LEFT JOIN users u ON p.created_by = u.id
             WHERE p.id = ?`,
            [id]
        );

        if (polls.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在'
            });
        }

        const [options] = await pool.query(
            `SELECT id, option_text, sort_order
             FROM options
             WHERE poll_id = ?
             ORDER BY sort_order ASC`,
            [id]
        );

        const poll = polls[0];
        poll.options = options;

        res.json({
            code: 200,
            data: poll
        });
    } catch (err) {
        console.error('获取投票详情错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

async function createPoll(req, res) {
    const { title, description, type, options, endTime, isAnonymous } = req.body;

    if (!title || !options || options.length < 2) {
        return res.status(400).json({
            code: 400,
            msg: '请填写标题并至少添加2个选项'
        });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            `INSERT INTO polls (title, description, type, status, end_time, is_anonymous, created_by)
             VALUES (?, ?, ?, 'active', ?, ?, ?)`,
            [
                title,
                description || null,
                type || 'single',
                endTime || null,
                isAnonymous || false,
                req.user.id
            ]
        );

        const pollId = result.insertId;

        for (let i = 0; i < options.length; i++) {
            await conn.query(
                'INSERT INTO options (poll_id, option_text, sort_order) VALUES (?, ?, ?)',
                [pollId, options[i], i + 1]
            );
        }

        await conn.commit();

        res.status(201).json({
            code: 201,
            msg: '投票创建成功',
            data: { id: pollId }
        });
    } catch (err) {
        await conn.rollback();
        console.error('创建投票错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    } finally {
        conn.release();
    }
}

async function updatePoll(req, res) {
    const { id } = req.params;
    const { title, description, type, status, endTime, isAnonymous } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE polls
             SET title = ?, description = ?, type = ?, status = ?, end_time = ?, is_anonymous = ?
             WHERE id = ? AND created_by = ?`,
            [
                title,
                description || null,
                type || 'single',
                status || 'active',
                endTime || null,
                isAnonymous || false,
                id,
                req.user.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在或无权限修改'
            });
        }

        res.json({
            code: 200,
            msg: '投票更新成功'
        });
    } catch (err) {
        console.error('更新投票错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

async function deletePoll(req, res) {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            'DELETE FROM polls WHERE id = ? AND created_by = ?',
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                code: 404,
                msg: '投票不存在或无权限删除'
            });
        }

        res.json({
            code: 200,
            msg: '投票删除成功'
        });
    } catch (err) {
        console.error('删除投票错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

async function getMyPolls(req, res) {
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * limit;

    try {
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM polls WHERE created_by = ?',
            [req.user.id]
        );
        const total = countResult[0].total;

        const [rows] = await pool.query(
            `SELECT p.id, p.title, p.type, p.status, p.end_time, p.created_at,
                    (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id) as vote_count
             FROM polls p
             WHERE p.created_by = ?
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [req.user.id, limit, offset]
        );

        res.json({
            code: 200,
            data: {
                list: rows,
                total: total,
                page: pageNum,
                pageSize: limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('获取我的投票列表错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

module.exports = {
    getPolls,
    getPollById,
    createPoll,
    updatePoll,
    deletePoll,
    getMyPolls
};