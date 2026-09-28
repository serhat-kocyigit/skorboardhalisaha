/**
 * Timer Socket Handler - Sayaç socket event'leri
 * DÜZELTİLDİ: matchId önce data'dan, yoksa getActive()'den alınır
 */
const timerController = require('../controllers/timerController');
const Match = require('../models/Match');

module.exports = function(io, socket) {

  /** Sayacı başlat */
  socket.on('timer:start', async (data) => {
    try {
      // Önce gönderilen matchId kullan, yoksa aktif maçı bul
      let match = null;
      if (data && data.matchId && data.matchId !== 'standby') {
        match = await Match.getById(data.matchId);
      }
      if (!match) {
        match = await Match.getActive();
      }
      if (!match) return;
      await timerController.startTimer(io, match.id);
    } catch (error) {
      console.error('timer:start hatası:', error.message);
    }
  });

  /** Sayacı duraklat */
  socket.on('timer:pause', async (data) => {
    try {
      let match = null;
      if (data && data.matchId && data.matchId !== 'standby') {
        match = await Match.getById(data.matchId);
      }
      if (!match) {
        match = await Match.getActive();
      }
      if (!match) return;
      await timerController.pauseTimer(io, match.id);
    } catch (error) {
      console.error('timer:pause hatası:', error.message);
    }
  });

  /** Sayacı sıfırla */
  socket.on('timer:reset', async (data) => {
    try {
      let match = null;
      if (data && data.matchId && data.matchId !== 'standby') {
        match = await Match.getById(data.matchId);
      }
      if (!match) {
        match = await Match.getActive();
      }
      if (!match) return;
      await timerController.resetTimer(io, match.id);
    } catch (error) {
      console.error('timer:reset hatası:', error.message);
    }
  });
};
