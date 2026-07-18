// routes/index.js

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const pollRoutes = require('./polls');
const voteRoutes = require('./votes');
const aiRoutes = require('./ai'); // 新增：导入 AI 路由

router.use('/auth', authRoutes);
router.use('/polls', pollRoutes);
router.use('/votes', voteRoutes);
router.use('/ai', aiRoutes); // 新增：挂载 AI 路由

module.exports = router;
