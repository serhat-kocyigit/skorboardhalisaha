/**
 * Upload Controller - Dosya yükleme işlemleri
 */
const Settings = require('../models/Settings');
const Team = require('../models/Team');
const Ad = require('../models/Ad');

const uploadController = {
  /** Saha logosu yükle */
  async uploadFieldLogo(req, res) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Dosya seçilmedi' });
      const logoPath = `/uploads/logos/${req.file.filename}`;
      await Settings.update({ field_logo: logoPath });
      const io = req.app.get('io');
      if (io) io.emit('logo:changed', { type: 'field', path: logoPath });
      res.json({ success: true, data: { path: logoPath } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /** Takım logosu yükle */
  async uploadTeamLogo(req, res) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Dosya seçilmedi' });
      const { teamId } = req.params;
      const logoPath = `/uploads/teams/${req.file.filename}`;
      await Team.update(teamId, { logo: logoPath });
      const io = req.app.get('io');
      if (io) io.emit('logo:changed', { type: 'team', teamId, path: logoPath });
      res.json({ success: true, data: { path: logoPath } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /** Reklam görseli yükle */
  async uploadAd(req, res) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'Dosya seçilmedi' });
      const imagePath = `/uploads/ads/${req.file.filename}`;
      res.json({ success: true, data: { path: imagePath } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = uploadController;
