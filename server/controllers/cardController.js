/**
 * Card Controller - Kart (Sarı/Kırmızı) yönetim işlemleri
 */
const Card = require('../models/Card');
const Match = require('../models/Match');

const cardController = {
  /**
   * Maça ait kartları listele
   */
  async getByMatch(req, res) {
    try {
      const cards = await Card.getByMatchId(req.params.id);
      res.json({ success: true, data: cards });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Kart ver (sarı veya kırmızı)
   * Body: { team_id, player_id, card_type: 'yellow'|'red' }
   */
  async create(req, res) {
    try {
      const { id: match_id } = req.params;
      const { team_id, player_id, card_type } = req.body;

      if (!team_id || !player_id || !card_type) {
        return res.status(400).json({ success: false, message: 'Takım, oyuncu ve kart tipi zorunludur' });
      }

      if (!['yellow', 'red'].includes(card_type)) {
        return res.status(400).json({ success: false, message: 'Geçersiz kart tipi' });
      }

      const match = await Match.getById(match_id);
      if (!match) {
        return res.status(404).json({ success: false, message: 'Maç bulunamadı' });
      }

      const minute = Math.floor(match.elapsed_seconds / 60);
      const card = await Card.create({
        match_id,
        team_id,
        player_id,
        card_type,
        minute,
        period: match.current_period
      });

      // Takım bazlı kart sayıları
      const homeCards = await Card.getCountByTeam(match_id, match.team_home_id);
      const awayCards = await Card.getCountByTeam(match_id, match.team_away_id);

      // Socket.IO ile bildir
      const io = req.app.get('io');
      if (io) {
        const event = card_type === 'yellow' ? 'card:yellow' : 'card:red';
        io.emit(event, {
          card,
          homeCards,
          awayCards
        });
      }

      res.status(201).json({
        success: true,
        data: { card, homeCards, awayCards }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = cardController;
