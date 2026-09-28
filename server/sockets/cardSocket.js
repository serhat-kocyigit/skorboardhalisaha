/**
 * Card Socket Handler - Kart socket event'leri
 */
const Card = require('../models/Card');
const Match = require('../models/Match');

module.exports = function(io, socket) {
  /** Kart ver */
  socket.on('card:give', async (data) => {
    try {
      const { team_id, player_id, card_type } = data;
      const match = await Match.getActive();
      if (!match) return;

      const minute = Math.floor(match.elapsed_seconds / 60);
      const card = await Card.create({
        match_id: match.id, team_id, player_id, card_type,
        minute, period: match.current_period
      });

      const homeCards = await Card.getCountByTeam(match.id, match.team_home_id);
      const awayCards = await Card.getCountByTeam(match.id, match.team_away_id);

      const event = card_type === 'yellow' ? 'card:yellow' : 'card:red';
      io.emit(event, { card, homeCards, awayCards });
    } catch (error) {
      console.error('card:give hatası:', error.message);
    }
  });
};
