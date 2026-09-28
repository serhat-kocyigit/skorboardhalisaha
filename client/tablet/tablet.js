/**
 * Tablet Skor Kontrol Paneli
 * Sadece skor artırma/azaltma için basitleştirilmiş arayüz
 */

let currentMatch = null;
let homeScore = 0;
let awayScore = 0;

document.addEventListener('DOMContentLoaded', () => {
  const socket = SocketClient.connect();

  // Bağlantı durumu
  socket.on('connect', () => {
    document.getElementById('connectionStatus').className = 'connection-status connected';
    document.getElementById('connectionStatus').querySelector('.status-text').textContent = 'Bağlı';
    loadMatchData();
  });

  socket.on('disconnect', () => {
    document.getElementById('connectionStatus').className = 'connection-status disconnected';
    document.getElementById('connectionStatus').querySelector('.status-text').textContent = 'Bağlantı Koptu';
  });

  // State sync
  socket.on('match:stateSync', (data) => {
    if (data.match) {
      currentMatch = data.match;
      updateUI(data.match);
    }
  });

  // Skor değişikliği
  socket.on('score:changed', (data) => {
    if (data.match) {
      updateScore(data.match.score_home, data.match.score_away);
    }
    if (data.lastGoal) {
      showLastGoal(data.lastGoal);
    }
  });

  // Gol eklendi
  socket.on('goal:added', (data) => {
    if (data.match) {
      updateScore(data.match.score_home, data.match.score_away);
    }
    if (data.lastGoal) {
      showLastGoal(data.lastGoal);
    }
  });

  // Timer tick
  socket.on('timer:tick', (data) => {
    document.getElementById('matchTime').textContent = data.formatted || '00:00';
  });

  // Maç durumları
  socket.on('match:started', (m) => updateUI(m));
  socket.on('match:periodChanged', (m) => updateUI(m));
  socket.on('match:finished', (m) => updateUI(m));
  socket.on('match:created', (m) => updateUI(m));
  socket.on('match:reset', (m) => {
    updateUI(m);
    document.getElementById('lastGoal').style.display = 'none';
  });
});

// Maç verilerini yükle
async function loadMatchData() {
  try {
    const result = await API.get('/matches/active');
    if (result.success && result.data) {
      currentMatch = result.data;
      updateUI(result.data);
    }
  } catch (error) {
    console.error('Maç verisi yüklenemedi:', error);
  }
}

// UI güncelle
function updateUI(match) {
  if (!match) return;

  // Takım isimleri
  const isFormal = ['first_half', 'half_time', 'second_half', 'extra_time'].includes(match.status);
  document.getElementById('homeTeamName').textContent = isFormal ? (match.home_name || 'EV SAHİBİ') : 'EV SAHİBİ';
  document.getElementById('awayTeamName').textContent = isFormal ? (match.away_name || 'DEPLASMAN') : 'DEPLASMAN';

  // Skor
  updateScore(match.score_home || 0, match.score_away || 0);

  // Durum
  const statusNames = {
    pending: 'Maç Bekleniyor',
    first_half: '1. Yarı',
    half_time: 'Devre Arası',
    second_half: '2. Yarı',
    extra_time: 'Uzatma',
    finished: 'Maç Bitti'
  };
  document.getElementById('matchStatus').textContent = statusNames[match.status] || statusNames[match.current_period] || 'Bekleniyor';
}

// Skor güncelle
function updateScore(home, away) {
  homeScore = home;
  awayScore = away;
  document.getElementById('homeScore').textContent = home;
  document.getElementById('awayScore').textContent = away;
}

// Skor değiştir
async function changeScore(team, change) {
  if (!currentMatch) {
    alert('Aktif maç bulunamadı!');
    return;
  }

  const matchId = currentMatch.id || 'standby';
  const action = change > 0 ? 'increment' : 'decrement';

  try {
    const result = await API.post(`/matches/${matchId}/score`, {
      team,
      action,
      player_id: null
    });

    if (result.success) {
      // Skoru güncelle
      if (result.data.match) {
        updateScore(result.data.match.score_home || 0, result.data.match.score_away || 0);
      }

      // Gol animasyonu (skor artıysa)
      if (change > 0) {
        showGoalAnimation(team);
      }
    } else {
      alert('Skor güncellenemedi: ' + (result.message || 'Bilinmeyen hata'));
    }
  } catch (error) {
    console.error('Skor güncelleme hatası:', error);
    alert('Skor güncellenemedi!');
  }
}

// Tam ekran butonu
document.addEventListener('DOMContentLoaded', () => {
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }
});

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.error('Tam ekran hatası:', error);
  }
}
document.addEventListener('fullscreenchange', () => {
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  if (!fullscreenBtn) return;

  if (document.fullscreenElement) {
    fullscreenBtn.textContent = '×';
    fullscreenBtn.title = 'Tam Ekrandan Çık';
    fullscreenBtn.classList.add('fullscreen-active');
  } else {
    fullscreenBtn.textContent = '⛶';
    fullscreenBtn.title = 'Tam Ekran';
    fullscreenBtn.classList.remove('fullscreen-active');
  }
});
// Son gol göster
function showLastGoal(goal) {
  const lastGoalEl = document.getElementById('lastGoal');
  const lastGoalText = document.getElementById('lastGoalText');

  if (goal) {
    const d = goal.created_at ? new Date(goal.created_at) : new Date();
    const clockTime = d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const playerText = goal.player_name ? `${goal.player_name} (#${goal.jersey_number})` : '';
    lastGoalText.textContent = playerText
      ? `${goal.team_name} | ${playerText} — ${goal.minute}' (${clockTime})`
      : `${goal.team_name} — ${goal.minute}' (${clockTime})`;

    lastGoalEl.style.display = 'flex';
  } else {
    lastGoalEl.style.display = 'none';
  }
}

// Gol animasyonu
function showGoalAnimation(team) {
  const container = document.querySelector('.tablet-container');
  const animation = document.createElement('div');
  animation.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 5rem;
    font-weight: 900;
    color: #00ff88;
    text-shadow: 0 0 30px rgba(0, 255, 136, 0.8);
    z-index: 1000;
    animation: goalPop 1s ease-out;
  `;
  animation.textContent = '⚽ GOOOL!';
  container.appendChild(animation);

  setTimeout(() => animation.remove(), 1000);
}

// CSS animasyonu ekle
const style = document.createElement('style');
style.textContent = `
  @keyframes goalPop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }
`;
document.head.appendChild(style);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

function updateFullscreenButton() {
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  if (!fullscreenBtn) return;

  if (document.fullscreenElement || document.webkitFullscreenElement) {
    fullscreenBtn.textContent = '✕';
    fullscreenBtn.title = 'Tam Ekrandan Çık';
  } else {
    fullscreenBtn.textContent = '⛶';
    fullscreenBtn.title = 'Tam Ekran';
  }
}