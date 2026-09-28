/**
 * Player Routes
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/playerController');

router.get('/teams/:teamId/players', ctrl.getByTeam);
router.post('/teams/:teamId/players', ctrl.create);
router.put('/players/:id', ctrl.update);
router.delete('/players/:id', ctrl.delete);

module.exports = router;
