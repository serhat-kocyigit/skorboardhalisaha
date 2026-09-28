/**
 * Score Controller - Skor yönetim işlemleri
 * Hakem paneli ve ESP32 butonları buradan skor günceller
 */
const Match = require('../models/Match');
const Goal = require('../models/Goal');

const scoreController = {
  /**
   * Skor güncelle (+1 veya -1)
   * Body: { team: 'home'|'away', action: 'increment'|'decrement', player_id?: number }
   */
  async updateScore(req, res) {
    try {
      let { id } = req.params;
      const { team, action, player_id } = req.body;

      if (!['home', 'away'].includes(team)) {
        return res.status(400).json({ success: false, message: 'Geçersiz takım (home/away)' });
      }
      if (!['increment', 'decrement'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Geçersiz işlem (increment/decrement)' });
      }

      let match = null;
      if (id && id !== 'active' && id !== 'standby') {
        match = await Match.getById(id);
      }
      if (!match) {
        match = await Match.getActive() || await Match.getOrEnsureStandby();
      }
      if (!match) {
        return res.status(404).json({ success: false, message: 'Maç bulunamadı' });
      }

      id = match.id;

      // Skor hesapla
      let newScoreHome = match.score_home;
      let newScoreAway = match.score_away;

      if (team === 'home') {
        newScoreHome = action === 'increment' ? newScoreHome + 1 : Math.max(0, newScoreHome - 1);
      } else {
        newScoreAway = action === 'increment' ? newScoreAway + 1 : Math.max(0, newScoreAway - 1);
      }

      // Veritabanını güncelle
      const updatedMatch = await Match.updateScore(id, newScoreHome, newScoreAway);

      // Gol kaydı oluştur (artırma durumunda)
      let goalData = null;
      if (action === 'increment') {
        const teamId = team === 'home' ? match.team_home_id : match.team_away_id;
        const minute = Math.floor(match.elapsed_seconds / 60);
        goalData = await Goal.create({
          match_id: id,
          team_id: teamId,
          player_id: player_id || null,
          minute,
          period: match.current_period
        });
      } else if (action === 'decrement') {
        // Azaltma durumunda son golü sil
        const teamId = team === 'home' ? match.team_home_id : match.team_away_id;
        await Goal.deleteLast(id, teamId);
      }

      // Son gol bilgisi
      const lastGoal = await Goal.getLastGoal(id);

      // Socket.IO ile bildir
      const io = req.app.get('io');
      if (io) {
        io.emit('score:changed', {
          match: updatedMatch,
          lastGoal
        });

        // Gol animasyonu veya ses tetikle
        if (action === 'increment') {
          if (goalData) {
            io.emit('goal:added', {
              team,
              goal: goalData,
              match: updatedMatch
            });
          } else {
            io.emit('sound:play', { type: 'goal', message: '⚽ GOL!' });
          }
        }
      }

      res.json({
        success: true,
        data: {
          match: updatedMatch,
          goal: goalData,
          lastGoal
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * ESP32 Donanım Butonları İçin Hızlı Skor İşleyicisi
   */
  async handleEsp32Score(req, res) {
    req.body = {
      team: req.query.team,
      action: req.query.action
    };
    req.params = { id: 'active' };
    return scoreController.updateScore(req, res);
  }
};

module.exports = scoreController;
