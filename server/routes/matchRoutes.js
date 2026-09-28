/**
 * Match Routes
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/matchController');

router.get('/', ctrl.getAll);
router.get('/active', ctrl.getActive);
router.post('/', ctrl.create);
router.post('/quick', ctrl.quickStart);
router.put('/:id/teams', ctrl.updateTeams);
router.put('/:id/status', ctrl.updateStatus);
router.post('/:id/reset', ctrl.reset);
router.delete('/:id', ctrl.delete);

module.exports = router;
