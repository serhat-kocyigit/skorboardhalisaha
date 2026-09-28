/**
 * Upload Routes - Multer ile dosya yükleme
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/uploadController');
const upload = require('../middleware/upload');

router.post('/logo', upload.single('logo'), ctrl.uploadFieldLogo);
router.post('/team-logo/:teamId', upload.single('logo'), ctrl.uploadTeamLogo);
router.post('/ad', upload.single('image'), ctrl.uploadAd);

module.exports = router;
