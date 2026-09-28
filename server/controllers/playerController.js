/**
 * Player Controller - Oyuncu yönetim işlemleri
 */
const Player = require('../models/Player');

const playerController = {
  /**
   * Takıma ait oyuncuları listele
   */
  async getByTeam(req, res) {
    try {
      const players = await Player.getByTeamId(req.params.teamId);
      res.json({ success: true, data: players });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Yeni oyuncu ekle
   */
  async create(req, res) {
    try {
      const { name, jersey_number } = req.body;
      if (!name || jersey_number === undefined) {
        return res.status(400).json({ success: false, message: 'Ad ve forma numarası zorunludur' });
      }

      const player = await Player.create({
        ...req.body,
        team_id: req.params.teamId
      });

      res.status(201).json({ success: true, data: player });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Bu forma numarası zaten kullanılıyor' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Oyuncuyu güncelle
   */
  async update(req, res) {
    try {
      const player = await Player.update(req.params.id, req.body);
      if (!player) {
        return res.status(404).json({ success: false, message: 'Oyuncu bulunamadı' });
      }
      res.json({ success: true, data: player });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Bu forma numarası zaten kullanılıyor' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Oyuncuyu sil
   */
  async delete(req, res) {
    try {
      const deleted = await Player.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Oyuncu bulunamadı' });
      }
      res.json({ success: true, message: 'Oyuncu silindi' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = playerController;
