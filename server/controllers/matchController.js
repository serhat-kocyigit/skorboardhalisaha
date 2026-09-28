/**
 * Match Controller - Maç yönetim işlemleri
 */
const Match = require('../models/Match');
const Team = require('../models/Team');
const Goal = require('../models/Goal');
const Card = require('../models/Card');

const matchController = {
  /**
   * Tüm maçları listele
   */
  async getAll(req, res) {
    try {
      const matches = await Match.getAll();
      res.json({ success: true, data: matches });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Aktif maçı getir (tüm detaylarla)
   */
  async getActive(req, res) {
    try {
      let match = await Match.getActive();
      if (!match) {
        match = await Match.getOrEnsureStandby();
      }
      if (!match) {
        return res.json({ success: true, data: null, message: 'Aktif maç yok' });
      }

      // Gol ve kart bilgilerini de ekle
      const goals = await Goal.getByMatchId(match.id);
      const cards = await Card.getByMatchId(match.id);
      const lastGoal = await Goal.getLastGoal(match.id);

      // Takım bazlı kart sayıları
      const homeCards = await Card.getCountByTeam(match.id, match.team_home_id);
      const awayCards = await Card.getCountByTeam(match.id, match.team_away_id);

      res.json({
        success: true,
        data: {
          ...match,
          goals,
          cards,
          lastGoal,
          homeCards,
          awayCards
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Yeni maç oluştur
   */
  async create(req, res) {
    try {
      let { team_home_id, team_away_id, period_duration, extra_time_duration, match_date, quick_start } = req.body;

      // Eğer takımlar seçilmemişse veya quick_start istenmişse varsayılan takımları bul veya oluştur
      if (!team_home_id || !team_away_id || quick_start) {
        const teams = await Team.getAll();
        let homeTeam = teams.find(t => t.name.toLowerCase().includes('ev sahibi') || t.name.toLowerCase() === 'takım a');
        let awayTeam = teams.find(t => t.name.toLowerCase().includes('deplasman') || t.name.toLowerCase() === 'takım b');

        if (!homeTeam) {
          homeTeam = await Team.create({ name: 'Ev Sahibi', color_primary: '#00ff88', color_secondary: '#0a0a2e' });
        }
        if (!awayTeam || awayTeam.id === homeTeam.id) {
          awayTeam = await Team.create({ name: 'Deplasman', color_primary: '#4C9AFF', color_secondary: '#0a0a2e' });
        }

        team_home_id = team_home_id || homeTeam.id;
        team_away_id = team_away_id || awayTeam.id;
      }

      if (team_home_id === team_away_id) {
        return res.status(400).json({ success: false, message: 'Aynı takım seçilemez' });
      }

      let match = await Match.create({ team_home_id, team_away_id, period_duration, extra_time_duration, match_date });

      // Eğer hızlı başlatma (quick_start) ise maçı hemen başlat ve hakemi beklemeden sayacı çalıştır
      if (quick_start) {
        match = await Match.updateStatus(match.id, 'first_half', 'first_half');
        const io = req.app.get('io');
        if (io) {
          const timerController = require('./timerController');
          timerController.startTimer(io, match.id);
          io.emit('sound:play', { type: 'whistle_start', message: '⚡ Hızlı Maç Başladı!' });
        }
      }

      // Socket.IO ile bildir
      const io = req.app.get('io');
      if (io) {
        io.emit('match:created', match);
        if (quick_start) {
          io.emit('match:started', match);
          io.emit('match:stateSync', { match });
        }
      }

      res.status(201).json({ success: true, data: match });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Hızlı Maç Başlat (Takım seçilmesine gerek olmadan doğrudan başlatır)
   */
  async quickStart(req, res) {
    req.body.quick_start = true;
    return matchController.create(req, res);
  },

  /**
   * Mevcut maçın takımlarını değiştir/ata
   */
  async updateTeams(req, res) {
    try {
      const { id } = req.params;
      const { team_home_id, team_away_id } = req.body;

      if (!team_home_id || !team_away_id) {
        return res.status(400).json({ success: false, message: 'Her iki takım da seçilmelidir' });
      }
      if (team_home_id === team_away_id) {
        return res.status(400).json({ success: false, message: 'Aynı takım seçilemez' });
      }

      const match = await Match.updateTeams(id, team_home_id, team_away_id);
      
      const io = req.app.get('io');
      if (io) io.emit('match:stateSync', { match });

      res.json({ success: true, data: match });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Maç durumunu güncelle (ve zil çaldır)
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, current_period } = req.body;

      const validStatuses = ['pending', 'first_half', 'half_time', 'second_half', 'extra_time', 'finished'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Geçersiz durum' });
      }

      const match = await Match.updateStatus(id, status, current_period);
      
      const io = req.app.get('io');
      if (io) {
        const eventMap = {
          'first_half': 'match:started',
          'half_time': 'match:periodChanged',
          'second_half': 'match:periodChanged',
          'extra_time': 'match:periodChanged',
          'finished': 'match:finished'
        };
        io.emit(eventMap[status] || 'match:stateSync', match);

        // Zil sesleri (Whistle/Chime) ve otomatik sıfırlama tetiklemesi
        if (status === 'first_half') {
          io.emit('sound:play', { type: 'whistle_start', message: 'Maç Başladı!' });
        } else if (status === 'half_time') {
          io.emit('sound:play', { type: 'whistle_half', message: 'Devre Arası!' });
        } else if (status === 'second_half' || status === 'extra_time') {
          io.emit('sound:play', { type: 'whistle_resume', message: 'Yarı Başladı!' });
        } else if (status === 'finished') {
          io.emit('sound:play', { type: 'whistle_end', message: 'Maç Bitti!' });
          setTimeout(async () => {
            try {
              const standbyMatch = await Match.getOrEnsureStandby();
              const resetStandby = await Match.resetStandby(standbyMatch.id);
              io.emit('match:reset', resetStandby);
              io.emit('match:started', resetStandby);
              io.emit('match:stateSync', { match: resetStandby });
              const timerController = require('./timerController');
              timerController.startTimer(io, standbyMatch.id);
              console.log('🔄 Maç bitti ve skorboard otomatik serbest moda döndü/sıfırlandı:', resetStandby.id);
            } catch (err) {
              console.error('Maç sonu sıfırlama hatası:', err.message);
            }
          }, 3000); // 3 saniye zil ve maç sonu gösterimi sonrası sıfırla ve serbest moda dön
        }
      }

      res.json({ success: true, data: match });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Maçı sıfırla
   */
  async reset(req, res) {
    try {
      const { id } = req.params;
      const match = await Match.reset(id);

      const io = req.app.get('io');
      if (io) {
        io.emit('match:reset', match);
        io.emit('sound:play', { type: 'hourly_reset', message: 'Skorboard Sıfırlandı' });
      }

      res.json({ success: true, data: match });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Maçı sil
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Match.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Maç bulunamadı' });
      }
      res.json({ success: true, message: 'Maç silindi' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = matchController;
