/**
 * Card Routes
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cardController');

router.get('/:id/cards', ctrl.getByMatch);
router.post('/:id/cards', ctrl.create);

module.exports = router;
