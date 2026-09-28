/**
 * Score Routes
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/scoreController');

router.post('/:id/score', ctrl.updateScore);

module.exports = router;
