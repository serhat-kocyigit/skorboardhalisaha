/**
 * Timer Controller - Sayaç yönetim işlemleri
 * Server-side timer: güvenilir ve senkronize
 */
const Match = require('../models/Match');

// Aktif sayaç referansı (tek saha = tek sayaç)
let activeTimer = null;
let currentMatchId = null;
// İlk açılışta mevcut saat neyse onu kaydet (böylece tam 00 dakikasına girildiğinde tetiklenir)
const getTurkeyDate = () => {
  const now = new Date();
  const turkeyTimeString = now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
  return new Date(turkeyTimeString);
};

let lastResetHour = getTurkeyDate().getHours();

const timerController = {
  /**
   * Sayaç durumunu al
   */
  getTimerState() {
    return {
      isRunning: activeTimer !== null,
      matchId: currentMatchId
    };
  },

  /**
   * Saat Başı Sıfırlamasını Çalıştıran Ortak Fonksiyon (Saniyeyi düşünmeden, dakika 00 olunca tetiklenir)
   */
  async triggerHourlyReset(io, hour) {
    if (lastResetHour === hour) return;
    lastResetHour = hour;

    console.log(`⏰ Türkiye Saati ${String(hour).padStart(2, '0')}:00 - Saat Başı Sıfırlaması Tetiklendi!`);

    try {
      let targetMatch = await Match.getActive();
      if (!targetMatch) {
        targetMatch = await Match.getOrEnsureStandby();
      }

      if (targetMatch) {
        const resetMatch = await Match.resetStandby(targetMatch.id);
        if (io) {
          io.emit('match:reset', resetMatch);
          io.emit('match:started', resetMatch);
          io.emit('match:stateSync', { match: resetMatch });

          // Kesin ve net duyulması için hem whistle_start hem de hourly_reset çal
          io.emit('sound:play', {
            type: 'whistle_start',
            message: `⏰ Türkiye Saati (${String(hour).padStart(2, '0')}:00) - Saat Başı Yeni Maç Başladı!`
          });
          setTimeout(() => {
            if (io) io.emit('sound:play', { type: 'hourly_reset' });
          }, 800);
        }

        // Sayacı serbest modda baştan başlat
        this.startTimer(io, targetMatch.id);
      }
    } catch (err) {
      console.error('Saat başı sıfırlama hatası:', err.message);
    }
  },

  /**
   * Türkiye Saatine (UTC+3) göre saat başı kontrolü ve otomatik Hızlı Maç Modu
   * Her saniye çağrılır
   */
  async checkHourlyReset(io) {
    try {
      const turkeyDate = getTurkeyDate();
      const hour = turkeyDate.getHours();
      const minute = turkeyDate.getMinutes();

      const activeMatch = await Match.getActive();
      const isFormalRunningMatch = activeMatch && ['first_half', 'half_time', 'second_half', 'extra_time'].includes(activeMatch.status);

      if (!isFormalRunningMatch) {
        let targetMatch = activeMatch;
        if (!targetMatch) {
          targetMatch = await Match.getOrEnsureStandby();
        }

        // Sayaç akmıyorsa başlat
        if (activeTimer === null && targetMatch) {
          this.startTimer(io, targetMatch.id);
        }

        // Tam saat başı (00:00 dakikası) kontrolü - saniyeyi düşünmeden dakika 00 olduğu anda sıfırla ve ses ver
        if (minute === 0 && lastResetHour !== hour) {
          await this.triggerHourlyReset(io, hour);
        }
      } else {
        // Formal maç devam ederken saat başı kontrolü atlanır
        if (minute === 0 && lastResetHour !== hour) {
          lastResetHour = hour;
          console.log(`⏰ Türkiye Saati ${String(hour).padStart(2, '0')}:00 - Hakemin başlattığı formal maç devam ediyor, saat başı sıfırlama atlandı.`);
        }
      }
    } catch (err) {
      console.error('Saat başı kontrol hatası:', err.message);
    }
  },

  /**
   * Sayacı başlat
   */
  async startTimer(io, matchId) {
    // Zaten çalışan sayaç varsa durdur
    if (activeTimer) {
      clearInterval(activeTimer);
    }

    currentMatchId = matchId;
    let match = await Match.getById(matchId);
    if (!match && matchId === 'standby') {
      match = await Match.getOrEnsureStandby();
    }
    if (!match) return;

    let elapsed = match.elapsed_seconds || 0;

    // Her saniye çalışan sayaç
    activeTimer = setInterval(async () => {
      elapsed++;

      // Veritabanını her 5 saniyede bir güncelle (performans)
      if (elapsed % 5 === 0) {
        await Match.updateElapsed(matchId, elapsed);
      }

      const currentMatchState = await Match.getById(matchId);
      const isFormalRunningMatch = currentMatchState && ['first_half', 'half_time', 'second_half', 'extra_time'].includes(currentMatchState.status);

      if (isFormalRunningMatch) {
        // Formal Maç: Sıfırdan başlar (00:00) ve belirlenen sürece kadar ARTARAK ilerler
        const currentPeriod = currentMatchState.current_period;
        let maxTime = (currentPeriod === 'half_time' || currentPeriod === 'extra_time') ? currentMatchState.extra_time_duration : currentMatchState.period_duration;

        io.emit('timer:tick', {
          matchId,
          elapsed,
          isSerbest: false,
          remaining: Math.max(0, maxTime - elapsed),
          formatted: formatTime(elapsed), // 0 dan başlayıp artarak ilerler
          isOvertime: elapsed > maxTime
        });

        // Süre bittiğinde otomatik geçişler
        if (elapsed >= maxTime) {
          if (currentPeriod === 'first_half') {
            // İlk yarı bitti -> Otomatik Devre Arasına (half_time) geç ve sayacı sıfırla/çalıştır
            await Match.updateStatus(matchId, 'half_time', 'half_time');
            await Match.updateElapsed(matchId, 0);
            elapsed = 0;
            const updatedMatch = await Match.getById(matchId);
            io.emit('sound:play', { type: 'whistle_half', message: 'İlk Yarı Bitti! Devre Arası Başladı.' });
            io.emit('match:periodChanged', updatedMatch);
            io.emit('match:stateSync', { match: updatedMatch });
            console.log(`⏸️ İlk yarı bitti, otomatik devre arasına geçildi: Maç #${matchId}`);
          } else if (currentPeriod === 'half_time') {
            // Devre arası bitti -> Otomatik İkinci Yarıya (second_half) geç ve sayacı sıfırla/çalıştır
            await Match.updateStatus(matchId, 'second_half', 'second_half');
            await Match.updateElapsed(matchId, 0);
            elapsed = 0;
            const updatedMatch = await Match.getById(matchId);
            io.emit('sound:play', { type: 'whistle_start', message: 'Devre Arası Bitti! 2. Yarı Başladı.' });
            io.emit('match:periodChanged', updatedMatch);
            io.emit('match:stateSync', { match: updatedMatch });
            console.log(`▶️ Devre arası bitti, otomatik ikinci yarıya geçildi: Maç #${matchId}`);
          } else {
            // İkinci yarı veya uzatma bitti -> Maçı bitir (finished) ve sayacı durdur
            clearInterval(activeTimer);
            activeTimer = null;
            await Match.updateStatus(matchId, 'finished', 'finished');
            await Match.updateElapsed(matchId, elapsed);
            const updatedMatch = await Match.getById(matchId);
            io.emit('timer:ended', { matchId, period: currentPeriod });
            io.emit('sound:play', { type: 'whistle_end', message: 'Maç Bitti!' });
            io.emit('match:finished', updatedMatch);
            io.emit('match:stateSync', { match: updatedMatch });
            console.log(`⏹️ Maç bitti: Maç #${matchId}`);

            // 3 saniye sonra otomatik olarak normal maçsız şekle (Serbest/Standby Mod) dön ve skorboardı sıfırla
            setTimeout(async () => {
              try {
                const standbyMatch = await Match.getOrEnsureStandby();
                const resetStandby = await Match.resetStandby(standbyMatch.id);
                if (io) {
                  io.emit('match:reset', resetStandby);
                  io.emit('match:started', resetStandby);
                  io.emit('match:stateSync', { match: resetStandby });
                }
                module.exports.startTimer(io, standbyMatch.id);
                console.log(`🔄 Planlanmış maç bitti, otomatik serbest moda dönüldü: #${standbyMatch.id}`);
              } catch (err) {
                console.error('Serbest moda dönüş hatası:', err.message);
              }
            }, 3000);
          }
        }
      } else {
        // Serbest Mod / Saat Başı Hızlı Maç Modu: Saat ve dakika altında saniye olur, bunlar artarak ilerler
        const turkeyDate = getTurkeyDate();
        const hourNum = turkeyDate.getHours();
        const minuteNum = turkeyDate.getMinutes();
        const hour = String(hourNum).padStart(2, '0');
        const minute = String(minuteNum).padStart(2, '0');
        const second = String(turkeyDate.getSeconds()).padStart(2, '0');

        // Tam saat başı kontrolü (Saniyeyi düşünmeden, dakika 00 olduğu anda tetikle)
        if (minuteNum === 0 && lastResetHour !== hourNum) {
          timerController.triggerHourlyReset(io, hourNum);
        }

        io.emit('timer:tick', {
          matchId,
          elapsed,
          isSerbest: true,
          hour,
          minute,
          second,
          formatted: `${hour}:${minute}:${second}`
        });
      }
    }, 1000);

    console.log(`⏱️ Sayaç başlatıldı: Maç #${matchId}`);
  },

  /**
   * Sayacı duraklat
   */
  async pauseTimer(io, matchId) {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;

      const match = await Match.getById(matchId);
      io.emit('timer:paused', {
        matchId,
        elapsed: match ? match.elapsed_seconds : 0
      });

      console.log(`⏸️ Sayaç duraklatıldı: Maç #${matchId}`);
    }
  },

  /**
   * Sayacı sıfırla
   */
  async resetTimer(io, matchId) {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }

    await Match.updateElapsed(matchId, 0);
    currentMatchId = null;

    io.emit('timer:reset', { matchId });
    console.log(`🔄 Sayaç sıfırlandı: Maç #${matchId}`);
  },

  /**
   * Sunucu kapanırken temizlik
   */
  cleanup() {
    if (activeTimer) {
      clearInterval(activeTimer);
      activeTimer = null;
    }
  }
};

/**
 * Saniyeyi MM:SS formatına çevirir
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

module.exports = timerController;
