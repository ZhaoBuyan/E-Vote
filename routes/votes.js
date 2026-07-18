const express = require('express');
const router = express.Router();
const {
    checkVoted,
    submitVote,
    getResults
} = require('../controllers/voteController');
const { authMiddleware } = require('../middleware/auth');

router.get('/:id/check', authMiddleware, checkVoted);
router.post('/:id', authMiddleware, submitVote);
router.get('/:id/results', getResults);

module.exports = router;