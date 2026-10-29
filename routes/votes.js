const express = require('express')
const router = express.Router()
const {
    checkVoted,
    submitVote,
    getResults,
    exportResults
} = require('../controllers/voteController')
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth')

router.get('/:id/check', authMiddleware, checkVoted)
router.post('/:id', authMiddleware, submitVote)
router.get('/:id/results', optionalAuthMiddleware, getResults)
router.get('/:id/export', authMiddleware, exportResults) // 新增

module.exports = router
