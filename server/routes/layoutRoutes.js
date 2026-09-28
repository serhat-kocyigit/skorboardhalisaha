/**
 * Layout Routes
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/layoutController');

router.get('/', ctrl.getAll);
router.get('/active', ctrl.getActive);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/activate', ctrl.activate);

module.exports = router;
