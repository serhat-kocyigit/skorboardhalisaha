/**
 * Team Controller - Takım yönetim işlemleri
 */
const Team = require('../models/Team');

const teamController = {
  /**
   * Tüm takımları listele
   */
  async getAll(req, res) {
    try {
      const teams = await Team.getAll();
      res.json({ success: true, data: teams });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Takım detayı
   */
  async getById(req, res) {
    try {
      const team = await Team.getById(req.params.id);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Takım bulunamadı' });
      }
      res.json({ success: true, data: team });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Yeni takım oluştur
   */
  async create(req, res) {
    try {
      const { name } = req.body;
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Takım adı zorunludur' });
      }
      const team = await Team.create(req.body);
      
      const io = req.app.get('io');
      if (io) io.emit('teams:updated');

      res.status(201).json({ success: true, data: team });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Takımı güncelle
   */
  async update(req, res) {
    try {
      const team = await Team.update(req.params.id, req.body);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Takım bulunamadı' });
      }

      const io = req.app.get('io');
      if (io) io.emit('teams:updated');

      res.json({ success: true, data: team });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Takımı sil
   */
  async delete(req, res) {
    try {
      const deleted = await Team.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Takım bulunamadı' });
      }
      res.json({ success: true, message: 'Takım silindi' });
    } catch (error) {
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ success: false, message: 'Bu takım aktif bir maçta kullanılıyor, silinemez' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = teamController;
