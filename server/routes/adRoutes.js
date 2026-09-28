/**
 * Ad Routes
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adController');

router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);
router.post('/:id/show', ctrl.showAd);
router.post('/:id/hide', ctrl.hideAd);

module.exports = router;
