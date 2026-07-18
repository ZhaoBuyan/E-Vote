const express = require('express');
const router = express.Router();
const {
    getPolls,
    getPollById,
    createPoll,
    updatePoll,
    deletePoll,
    getMyPolls
} = require('../controllers/pollController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 公开路由
router.get('/', getPolls);
router.get('/:id', getPollById);

// 需要认证的路由
router.get('/my/list', authMiddleware, getMyPolls);
router.post('/', authMiddleware, createPoll);
router.put('/:id', authMiddleware, updatePoll);
router.delete('/:id', authMiddleware, deletePoll);

module.exports = router;