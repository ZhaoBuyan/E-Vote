const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function register(req, res) {
    const { username, password, realName } = req.body;

    if (!username || !password || !realName) {
        return res.status(400).json({
            code: 400,
            msg: '请填写所有必填字段'
        });
    }

    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({
            code: 400,
            msg: '用户名长度应为3-20个字符'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            code: 400,
            msg: '密码长度不能少于6个字符'
        });
    }

    try {
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                code: 400,
                msg: '用户名已存在'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (username, password, real_name) VALUES (?, ?, ?)',
            [username, hashedPassword, realName]
        );

        res.status(201).json({
            code: 201,
            msg: '注册成功',
            data: {
                id: result.insertId,
                username: username
            }
        });
    } catch (err) {
        console.error('注册错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            code: 400,
            msg: '请输入用户名和密码'
        });
    }

    try {
        const [users] = await pool.execute(
            'SELECT id, username, password, real_name, role FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                code: 401,
                msg: '用户名或密码错误'
            });
        }

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({
                code: 401,
                msg: '用户名或密码错误'
            });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            code: 200,
            msg: '登录成功',
            data: {
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    realName: user.real_name,
                    role: user.role
                }
            }
        });
    } catch (err) {
        console.error('登录错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

async function getMe(req, res) {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, real_name, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '用户不存在'
            });
        }

        res.json({
            code: 200,
            data: users[0]
        });
    } catch (err) {
        console.error('获取用户信息错误:', err);
        res.status(500).json({
            code: 500,
            msg: '服务器错误'
        });
    }
}

module.exports = { register, login, getMe };