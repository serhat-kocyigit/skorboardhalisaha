/**
 * Score Socket Handler - ESP32 ve hakem skor event'leri
 * DÜZELTİLDİ: esp32:scoreUpdate artık io üzerinden doğru yayılıyor
 */
const Match = require('../models/Match');
const Goal = require('../models/Goal');

module.exports = function(io, socket) {
  /**
   * Skor güncelleme (socket üzerinden)
   * data: { team: 'home'|'away', action: 'increment'|'decrement', player_id? }
   */
  socket.on('score:update', async (data) => {
    try {
      const { team, action } = data;
      const match = await Match.getActive();
      if (!match) return;

      let newHome = match.score_home;
      let newAway = match.score_away;

      if (team === 'home') {
        newHome = action === 'increment' ? newHome + 1 : Math.max(0, newHome - 1);
      } else {
        newAway = action === 'increment' ? newAway + 1 : Math.max(0, newAway - 1);
      }

      const updated = await Match.updateScore(match.id, newHome, newAway);

      if (action === 'increment') {
        const teamId = team === 'home' ? match.team_home_id : match.team_away_id;
        const minute = Math.floor((match.elapsed_seconds || 0) / 60);
        const goal = await Goal.create({
          match_id: match.id, team_id: teamId,
          player_id: data.player_id || null,
          minute, period: match.current_period || 'first_half'
        });
        const lastGoal = await Goal.getLastGoal(match.id);
        io.emit('goal:added', { team, goal, match: updated });
        io.emit('score:changed', { match: updated, lastGoal });
      } else {
        const teamId = team === 'home' ? match.team_home_id : match.team_away_id;
        await Goal.deleteLast(match.id, teamId);
        const lastGoal = await Goal.getLastGoal(match.id);
        io.emit('score:changed', { match: updated, lastGoal });
      }
    } catch (error) {
      console.error('score:update hatası:', error.message);
    }
  });

  /**
   * ESP32 skor güncelleme — DÜZELTİLDİ: io.emit yerine direkt işliyoruz
   * Eski: socket.emit('score:update', data) — socket kendini dinleyemez, çalışmıyordu
   */
  socket.on('esp32:scoreUpdate', async (data) => {
    try {
      const { team, action } = data;
      const match = await Match.getActive();
      if (!match) return;

      let newHome = match.score_home;
      let newAway = match.score_away;

      if (team === 'home') {
        newHome = action === 'increment' ? newHome + 1 : Math.max(0, newHome - 1);
      } else {
        newAway = action === 'increment' ? newAway + 1 : Math.max(0, newAway - 1);
      }

      const updated = await Match.updateScore(match.id, newHome, newAway);
      const teamId = team === 'home' ? match.team_home_id : match.team_away_id;

      if (action === 'increment') {
        const minute = Math.floor((match.elapsed_seconds || 0) / 60);
        const goal = await Goal.create({
          match_id: match.id, team_id: teamId,
          player_id: null, minute,
          period: match.current_period || 'first_half'
        });
        const lastGoal = await Goal.getLastGoal(match.id);
        io.emit('goal:added', { team, goal, match: updated });
        io.emit('score:changed', { match: updated, lastGoal });
      } else {
        await Goal.deleteLast(match.id, teamId);
        const lastGoal = await Goal.getLastGoal(match.id);
        io.emit('score:changed', { match: updated, lastGoal });
      }
    } catch (error) {
      console.error('esp32:scoreUpdate hatası:', error.message);
    }
  });
};
