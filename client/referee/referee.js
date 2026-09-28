/**
 * Hakem Paneli JavaScript
 * Maç yönetimi, skor, kartlar, takım ve ayarlar
 */

// ============================================
// GLOBAL STATE
// ============================================
let currentMatch = null;
let teams = [];
let selectedPlayerTeamId = null;

// ============================================
// BAŞLATMA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSocket(); // connect() içinde zaten match:requestSync gönderiliyor
  loadTeams();
  loadAds();
  // NOT: SocketClient.emit('match:requestSync') burada YOK
  // socket-client.js'deki connect event handler zaten gönderiyor
});

// ============================================
// TAB NAVİGASYONU
// ============================================
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ============================================
// SOCKET.IO
// ============================================
function initSocket() {
  const socket = SocketClient.connect();
  const dot = document.getElementById('connectionDot');

  socket.on('connect', () => {
    dot.className = 'connection-dot connected';
  });

  socket.on('disconnect', () => {
    dot.className = 'connection-dot disconnected';
  });

  // Tam state senkronizasyonu
  socket.on('match:stateSync', (data) => {
    if (data.match !== undefined) {
      currentMatch = data.match;
      updateMatchUI();
      displayRefereeLastGoal(currentMatch ? (currentMatch.lastGoal || null) : null);
    }
    if (data.settings) updateSettingsUI(data.settings);
  });

  // Skor güncellemeleri
  socket.on('score:changed', (data) => {
    if (data.match) {
      currentMatch = { ...currentMatch, ...data.match };
      updateScoreUI();
    }
    displayRefereeLastGoal(data.lastGoal || null);
  });

  // Gol eklendiğinde
  socket.on('goal:added', (data) => {
    if (data.goal) displayRefereeLastGoal(data.goal);
  });

  // Sayaç
  socket.on('timer:tick', (data) => {
    if (data.isSerbest) {
      document.getElementById('miniTimer').innerHTML = `${data.hour}:${data.minute} <span style="font-size:0.65em; color:#00ff88;">:${data.second}</span>`;
    } else {
      document.getElementById('miniTimer').textContent = data.formatted;
    }
  });

  // Maç durumları
  socket.on('match:created', (match) => {
    currentMatch = match;
    updateMatchUI();
    showToast('Maç oluşturuldu');
  });

  socket.on('match:started', (match) => {
    currentMatch = match;
    updateMatchUI();
  });

  socket.on('match:periodChanged', (match) => {
    currentMatch = match;
    updateMatchUI();
  });

  socket.on('match:finished', (match) => {
    currentMatch = match;
    updateMatchUI();
  });

  socket.on('match:reset', (match) => {
    currentMatch = match;
    updateMatchUI();
    displayRefereeLastGoal(null);
    showToast('Maç sıfırlandı');
  });

  // Kartlar
  socket.on('card:yellow', (data) => {
    loadMatchCards();
    showToast('Sarı kart verildi');
  });

  socket.on('card:red', (data) => {
    loadMatchCards();
    showToast('Kırmızı kart verildi');
  });

  // Takımlar
  socket.on('teams:updated', () => loadTeams());
}

// ============================================
// MAÇ YÖNETİMİ
// ============================================

/** Hızlı Maç modu otomatik saat başı devreye girdiği için buton kaldırıldı */

/** Yeni maç oluştur */
async function createMatch() {
  const homeId = document.getElementById('selectHomeTeam').value;
  const awayId = document.getElementById('selectAwayTeam').value;
  const periodMin = parseInt(document.getElementById('inputPeriodDuration').value) || 10;
  const extraMin = parseInt(document.getElementById('inputExtraTime').value) || 5;

  if (!homeId || !awayId) return showToast('Her iki takımı da seçin', true);
  if (homeId === awayId) return showToast('Farklı takımlar seçin', true);

  const result = await API.post('/matches', {
    team_home_id: parseInt(homeId),
    team_away_id: parseInt(awayId),
    period_duration: periodMin * 60,
    extra_time_duration: extraMin * 60
  });

  if (result.success) {
    currentMatch = result.data;
    updateMatchUI();
    loadGoalPlayers();
  } else {
    showToast(result.message, true);
  }
}

/** Seçili takımları aktif maça ata / değiştir */
async function assignTeamsToActiveMatch() {
  if (!currentMatch) return showToast('Önce maçı başlatın veya oluşturun', true);
  const homeId = document.getElementById('assignHomeTeam').value;
  const awayId = document.getElementById('assignAwayTeam').value;

  if (!homeId || !awayId) return showToast('Her iki takımı da seçin', true);
  if (homeId === awayId) return showToast('Farklı takımlar seçilmeli', true);

  const result = await API.put(`/matches/${currentMatch.id}/teams`, {
    team_home_id: parseInt(homeId),
    team_away_id: parseInt(awayId)
  });

  if (result.success) {
    currentMatch = result.data;
    updateMatchUI();
    loadGoalPlayers();
    showToast('👥 Takımlar maça atandı!');
  } else {
    showToast(result.message, true);
  }
}

/** Maç aksiyonları */
async function matchAction(action) {
  if (!currentMatch) return;
  const id = currentMatch.id;

  switch(action) {
    case 'start':
      // Önce status'ü güncelle, ardından timer'ı başlat
      await API.put(`/matches/${id}/status`, { status: 'first_half', current_period: 'first_half' });
      SocketClient.emit('timer:start', { matchId: id });
      showToast('▶ Maç başladı!');
      break;

    case 'pause':
      SocketClient.emit('timer:pause', { matchId: id });
      showToast('⏸ Maç duraklatıldı');
      break;

    case 'resume':
      SocketClient.emit('timer:start', { matchId: id });
      showToast('▶ Maç devam ediyor');
      break;

    case 'halfTime':
      // Önce API ile devre arasına al (server ses çalar), sonra timer'ı durdur
      await API.put(`/matches/${id}/status`, { status: 'half_time', current_period: 'half_time' });
      SocketClient.emit('timer:pause', { matchId: id });
      showToast('⏯ Devre arası');
      break;

    case 'secondHalf':
      await API.put(`/matches/${id}/status`, { status: 'second_half', current_period: 'second_half' });
      SocketClient.emit('timer:start', { matchId: id });
      showToast('▶ 2. Yarı başladı');
      break;

    case 'end':
      // Önce status'ü bitir (server sesi çalar + 3s sonra standby'a döner)
      // Timer pause gönderme — server zaten yönetiyor
      await API.put(`/matches/${id}/status`, { status: 'finished' });
      showToast('⏹ Maç bitti');
      break;

    case 'reset':
      if (!confirm('Maçı sıfırlamak istediğinize emin misiniz?')) return;
      await API.post(`/matches/${id}/reset`);
      SocketClient.emit('timer:reset', { matchId: id });
      showToast('🔄 Sıfırlandı');
      break;
  }

  // Kısa gecikme sonrası güncel state'i çek (server işlemini tamamlasın)
  setTimeout(async () => {
    const result = await API.get('/matches/active');
    if (result.success && result.data !== undefined) {
      currentMatch = result.data;
      updateMatchUI();
    }
  }, 300);
}

/** Maç UI'ını ve son gol bilgisini güncelle */
function updateMatchUI() {
  const card = document.getElementById('currentMatchCard');
  const assignSection = document.getElementById('matchTeamAssignSection');
  const lastGoalBar = document.getElementById('refereeLastGoalBar');

  card.style.display = 'block';

  // Son gol gösterimi (Dakika ve Saat)
  if (currentMatch && currentMatch.lastGoal) {
    displayRefereeLastGoal(currentMatch.lastGoal);
  } else if (lastGoalBar) {
    lastGoalBar.style.display = 'none';
  }

  // Planlanmış aktif formal maç yoksa saat başı hızlı maç modundayız
  if (!currentMatch || currentMatch.status === 'standby' || currentMatch.status === 'pending' || currentMatch.status === 'finished') {
    if (currentMatch && currentMatch.status === 'pending') {
      // Planlanmış maç oluşturuldu ve başlatılması bekleniyor
      assignSection.style.display = 'block';
      document.getElementById('miniHomeName').textContent = currentMatch.home_name || 'Ev Sahibi';
      document.getElementById('miniAwayName').textContent = currentMatch.away_name || 'Deplasman';
      document.getElementById('miniScoreHome').textContent = currentMatch.score_home || 0;
      document.getElementById('miniScoreAway').textContent = currentMatch.score_away || 0;
      document.getElementById('matchStatusBadge').textContent = 'Planlanmış Maç (Bekleniyor)';
      
      document.getElementById('btnStartMatch').style.display = '';
      document.getElementById('btnPauseMatch').style.display = 'none';
      document.getElementById('btnResumeMatch').style.display = 'none';
      document.getElementById('btnHalfTime').style.display = 'none';
      document.getElementById('btnEndMatch').style.display = 'none';
      document.getElementById('btnResetMatch').style.display = '';
    } else {
      // Saat Başı Otomatik Hızlı Maç Modu
      assignSection.style.display = 'none';
      const homeName = 'Ev Sahibi';
      const awayName = 'Deplasman';
      const sHome = currentMatch ? (currentMatch.score_home || 0) : 0;
      const sAway = currentMatch ? (currentMatch.score_away || 0) : 0;

      document.getElementById('miniHomeName').textContent = homeName;
      document.getElementById('miniAwayName').textContent = awayName;
      document.getElementById('miniScoreHome').textContent = sHome;
      document.getElementById('miniScoreAway').textContent = sAway;
      document.getElementById('matchStatusBadge').textContent = 'Saat Başı Hızlı Mod (Aktif)';
      
      document.getElementById('btnStartMatch').style.display = 'none';
      document.getElementById('btnPauseMatch').style.display = 'none';
      document.getElementById('btnResumeMatch').style.display = 'none';
      document.getElementById('btnHalfTime').style.display = 'none';
      document.getElementById('btnEndMatch').style.display = 'none';
      document.getElementById('btnResetMatch').style.display = '';
    }
    updateScoreUI();
    return;
  }

  // Hakemin başlattığı formal maç aktif
  assignSection.style.display = 'block';
  document.getElementById('miniHomeName').textContent = currentMatch.home_name || 'Ev Sahibi';
  document.getElementById('miniAwayName').textContent = currentMatch.away_name || 'Deplasman';
  document.getElementById('miniScoreHome').textContent = currentMatch.score_home || 0;
  document.getElementById('miniScoreAway').textContent = currentMatch.score_away || 0;

  const statusNames = {
    'first_half': '1. Yarı (İşliyor)', 'half_time': 'Devre Arası',
    'second_half': '2. Yarı (İşliyor)', 'extra_time': 'Uzatma'
  };
  document.getElementById('matchStatusBadge').textContent = statusNames[currentMatch.status] || currentMatch.status;

  if (currentMatch.team_home_id) document.getElementById('assignHomeTeam').value = currentMatch.team_home_id;
  if (currentMatch.team_away_id) document.getElementById('assignAwayTeam').value = currentMatch.team_away_id;

  const s = currentMatch.status;
  const isRunning  = ['first_half', 'second_half', 'extra_time'].includes(s);
  const isHalfTime = s === 'half_time';

  document.getElementById('btnStartMatch').style.display   = (s === 'pending')  ? '' : 'none';
  document.getElementById('btnPauseMatch').style.display   = isRunning           ? '' : 'none';
  document.getElementById('btnResumeMatch').style.display  = 'none'; // ileride pause state eklenirse aktif edilir
  document.getElementById('btnHalfTime').style.display     = (s === 'first_half') ? '' : 'none';
  // "Bitir" sadece 2. yarı veya uzatma çalışırken göster
  document.getElementById('btnEndMatch').style.display     = (s === 'second_half' || s === 'extra_time') ? '' : 'none';
  document.getElementById('btnResetMatch').style.display   = '';

  updateScoreUI();
  loadGoalPlayers();
  loadMatchCards();
  updateCardTeamSelect();
}

/** Hakem panelinde son golü dakika ve saat ile göster */
function displayRefereeLastGoal(goal) {
  const bar = document.getElementById('refereeLastGoalBar');
  if (!bar) return;
  if (!goal) {
    bar.style.display = 'none';
    return;
  }

  let clockTime = '';
  if (goal.created_at) {
    const d = new Date(goal.created_at);
    clockTime = d.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
  } else {
    const d = new Date();
    clockTime = d.toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' });
  }

  const playerText = goal.player_name ? `${goal.player_name} (#${goal.jersey_number})` : '';
  bar.textContent = playerText
    ? `⚽ Son Gol: ${goal.team_name} | ${playerText} — Dakika: ${goal.minute}' (Saat: ${clockTime})`
    : `⚽ Son Gol: ${goal.team_name} — Dakika: ${goal.minute}' (Saat: ${clockTime})`;
  bar.style.display = 'block';
}

/** Skor UI güncelle */
function updateScoreUI() {
  const isFormal = currentMatch && ['first_half', 'half_time', 'second_half', 'extra_time'].includes(currentMatch.status);
  const homeName = isFormal ? (currentMatch.home_name || 'Ev Sahibi') : 'Ev Sahibi';
  const awayName = isFormal ? (currentMatch.away_name || 'Deplasman') : 'Deplasman';
  const sHome = currentMatch ? (currentMatch.score_home || 0) : 0;
  const sAway = currentMatch ? (currentMatch.score_away || 0) : 0;

  document.getElementById('scoreCtrlHome').textContent = sHome;
  document.getElementById('scoreCtrlAway').textContent = sAway;
  document.getElementById('scoreHomeName').textContent = homeName;
  document.getElementById('scoreAwayName').textContent = awayName;
}

// ============================================
// SKOR
// ============================================

/** Skor güncelle */
async function updateScore(team, action) {
  const matchId = currentMatch ? currentMatch.id : 'standby';

  const playerSelectId = team === 'home' ? 'goalPlayerHome' : 'goalPlayerAway';
  const playerSelectEl = document.getElementById(playerSelectId);
  const playerId = playerSelectEl ? (playerSelectEl.value || null) : null;

  const result = await API.post(`/matches/${matchId}/score`, {
    team, action, player_id: playerId ? parseInt(playerId) : null
  });

  if (result.success) {
    currentMatch = { ...currentMatch, ...result.data.match };
    updateScoreUI();
    if (playerSelectEl) playerSelectEl.value = '';
  } else {
    showToast(result.message, true);
  }
}

/** Golcü oyuncularını yükle */
async function loadGoalPlayers() {
  if (!currentMatch) return;

  const loadPlayers = async (teamId, selectId) => {
    const result = await API.get(`/teams/${teamId}/players`);
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Golcü seçin (opsiyonel)</option>';
    if (result.success) {
      result.data.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.jersey_number} - ${p.name}</option>`;
      });
    }
  };

  if (currentMatch.team_home_id) await loadPlayers(currentMatch.team_home_id, 'goalPlayerHome');
  if (currentMatch.team_away_id) await loadPlayers(currentMatch.team_away_id, 'goalPlayerAway');
}

// ============================================
// KARTLAR
// ============================================

/** Kart tab takım seçeneklerini güncelle */
function updateCardTeamSelect() {
  if (!currentMatch) return;
  const select = document.getElementById('cardTeamSelect');
  select.innerHTML = '<option value="">Takım Seçin</option>';
  if (currentMatch.team_home_id) {
    select.innerHTML += `<option value="${currentMatch.team_home_id}">${currentMatch.home_name}</option>`;
  }
  if (currentMatch.team_away_id) {
    select.innerHTML += `<option value="${currentMatch.team_away_id}">${currentMatch.away_name}</option>`;
  }
}

/** Kart oyuncularını yükle */
async function loadCardPlayers() {
  const teamId = document.getElementById('cardTeamSelect').value;
  const select = document.getElementById('cardPlayerSelect');
  select.innerHTML = '<option value="">Oyuncu Seçin</option>';
  if (!teamId) return;

  const result = await API.get(`/teams/${teamId}/players`);
  if (result.success) {
    result.data.forEach(p => {
      select.innerHTML += `<option value="${p.id}">${p.jersey_number} - ${p.name}</option>`;
    });
  }
}

/** Kart ver */
async function giveCard(cardType) {
  if (!currentMatch) return showToast('Aktif maç yok', true);

  const teamId = document.getElementById('cardTeamSelect').value;
  const playerId = document.getElementById('cardPlayerSelect').value;

  if (!teamId || !playerId) return showToast('Takım ve oyuncu seçin', true);

  const result = await API.post(`/matches/${currentMatch.id}/cards`, {
    team_id: parseInt(teamId),
    player_id: parseInt(playerId),
    card_type: cardType
  });

  if (!result.success) showToast(result.message, true);
}

/** Maç kartlarını yükle */
async function loadMatchCards() {
  if (!currentMatch) return;
  const result = await API.get(`/matches/${currentMatch.id}/cards`);
  const container = document.getElementById('cardsListContent');

  if (result.success && result.data.length > 0) {
    container.innerHTML = result.data.map(c => `
      <div class="list-item">
        <div class="list-item-info">
          <span style="font-size:1.2rem">${c.card_type === 'yellow' ? '🟡' : '🔴'}</span>
          <div>
            <div class="list-item-name">${c.player_name} (#${c.jersey_number})</div>
            <div class="list-item-sub">${c.team_name} - ${c.minute}' ${c.period}</div>
          </div>
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<p class="empty-message">Henüz kart verilmedi</p>';
  }
}

// ============================================
// TAKIMLAR
// ============================================

/** Takımları yükle */
async function loadTeams() {
  const result = await API.get('/teams');
  if (!result.success) return;
  teams = result.data;

  // Takım listesi
  const list = document.getElementById('teamsList');
  if (teams.length === 0) {
    list.innerHTML = '<p class="empty-message">Henüz takım eklenmedi</p>';
  } else {
    list.innerHTML = teams.map(t => `
      <div class="list-item">
        <div class="list-item-info">
          ${t.logo ? `<img src="${t.logo}" class="list-item-logo">` : `<div class="list-item-logo" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">⚽</div>`}
          <div>
            <div class="list-item-name">${t.name}</div>
          </div>
        </div>
        <div class="list-item-actions">
          <button class="action-btn" onclick="openPlayerPanel(${t.id}, '${t.name}')">👥</button>
          <button class="action-btn danger" onclick="deleteTeam(${t.id})">🗑</button>
        </div>
      </div>
    `).join('');
  }

  // Maç oluşturma ve atama select'lerini güncelle
  const homeSelect = document.getElementById('selectHomeTeam');
  const awaySelect = document.getElementById('selectAwayTeam');
  const assignHome = document.getElementById('assignHomeTeam');
  const assignAway = document.getElementById('assignAwayTeam');

  const options = '<option value="">Takım Seçin</option>' + 
    teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  
  if (homeSelect) homeSelect.innerHTML = options;
  if (awaySelect) awaySelect.innerHTML = options;
  if (assignHome) assignHome.innerHTML = options;
  if (assignAway) assignAway.innerHTML = options;
}

/** Yeni takım oluştur */
async function createTeam() {
  const name = document.getElementById('inputTeamName').value.trim();
  if (!name) return showToast('Takım adı girin', true);

  const color = document.getElementById('inputTeamColor').value;
  const result = await API.post('/teams', { name, color_primary: color });

  if (result.success) {
    document.getElementById('inputTeamName').value = '';
    showToast('Takım eklendi');
    loadTeams();

    // Logo yükleme
    const fileInput = document.getElementById('inputTeamLogo');
    if (fileInput.files[0]) {
      const formData = new FormData();
      formData.append('logo', fileInput.files[0]);
      await API.upload(`/upload/team-logo/${result.data.id}`, formData);
      fileInput.value = '';
      loadTeams();
    }
  } else {
    showToast(result.message, true);
  }
}

/** Takım sil */
async function deleteTeam(id) {
  if (!confirm('Bu takımı silmek istediğinize emin misiniz?')) return;
  const result = await API.delete(`/teams/${id}`);
  if (result.success) {
    showToast('Takım silindi');
    loadTeams();
  } else {
    showToast(result.message, true);
  }
}

// ============================================
// OYUNCULAR
// ============================================

/** Oyuncu panelini aç */
function openPlayerPanel(teamId, teamName) {
  selectedPlayerTeamId = teamId;
  document.getElementById('playerTeamTitle').textContent = `${teamName} - Oyuncular`;
  document.getElementById('playerManagement').style.display = 'block';
  loadPlayers(teamId);
}

/** Oyuncu panelini kapat */
function closePlayerPanel() {
  document.getElementById('playerManagement').style.display = 'none';
  selectedPlayerTeamId = null;
}

/** Oyuncuları yükle */
async function loadPlayers(teamId) {
  const result = await API.get(`/teams/${teamId}/players`);
  const list = document.getElementById('playersList');

  if (result.success && result.data.length > 0) {
    list.innerHTML = result.data.map(p => `
      <div class="list-item">
        <div class="list-item-info">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;">${p.jersey_number}</div>
          <div>
            <div class="list-item-name">${p.name}</div>
            <div class="list-item-sub">${p.position}</div>
          </div>
        </div>
        <button class="action-btn danger" onclick="deletePlayer(${p.id})">🗑</button>
      </div>
    `).join('');
  } else {
    list.innerHTML = '<p class="empty-message">Oyuncu yok</p>';
  }
}

/** Oyuncu ekle */
async function addPlayer() {
  if (!selectedPlayerTeamId) return;
  const name = document.getElementById('inputPlayerName').value.trim();
  const number = parseInt(document.getElementById('inputPlayerNumber').value);
  const position = document.getElementById('inputPlayerPosition').value;

  if (!name || !number) return showToast('Ad ve numara zorunlu', true);

  const result = await API.post(`/teams/${selectedPlayerTeamId}/players`, {
    name, jersey_number: number, position
  });

  if (result.success) {
    document.getElementById('inputPlayerName').value = '';
    document.getElementById('inputPlayerNumber').value = '';
    showToast('Oyuncu eklendi');
    loadPlayers(selectedPlayerTeamId);
  } else {
    showToast(result.message, true);
  }
}

/** Oyuncu sil */
async function deletePlayer(id) {
  const result = await API.delete(`/players/${id}`);
  if (result.success) {
    showToast('Oyuncu silindi');
    if (selectedPlayerTeamId) loadPlayers(selectedPlayerTeamId);
  }
}

// ============================================
// AYARLAR
// ============================================

/** Ayarları kaydet */
async function saveSettings() {
  const name = document.getElementById('inputFieldName').value.trim();
  const fileInput = document.getElementById('inputFieldLogo');
  let changed = false;

  if (name) {
    const result = await API.put('/settings', { field_name: name });
    if (result.success) { changed = true; }
    else { return showToast(result.message || 'Kayıt başarısız', true); }
  }

  // Logo yükleme
  if (fileInput.files[0]) {
    const formData = new FormData();
    formData.append('logo', fileInput.files[0]);
    const upResult = await API.upload('/upload/logo', formData);
    if (upResult.success) {
      fileInput.value = '';
      changed = true;
    } else {
      return showToast('Logo yüklenemedi', true);
    }
  }

  if (changed) {
    showToast('✅ Ayarlar kaydedildi');
  } else {
    showToast('Değiştirilen bir ayar yok', false);
  }
}

/** Ayarlar UI güncelle */
function updateSettingsUI(settings) {
  if (settings.field_name) {
    document.getElementById('inputFieldName').value = settings.field_name;
  }
}

// ============================================
// REKLAMLAR
// ============================================

/** Reklam ekle */
async function addAd() {
  const title = document.getElementById('inputAdTitle').value.trim();
  const type = document.getElementById('inputAdType').value;
  const fileInput = document.getElementById('inputAdImage');

  if (!title) return showToast('Reklam başlığı girin', true);
  if (!fileInput.files[0]) return showToast('Görsel seçin', true);

  // Önce görseli yükle
  const formData = new FormData();
  formData.append('image', fileInput.files[0]);
  const uploadResult = await API.upload('/upload/ad', formData);

  if (uploadResult.success) {
    const result = await API.post('/ads', {
      title,
      image_path: uploadResult.data.path,
      ad_type: type
    });

    if (result.success) {
      document.getElementById('inputAdTitle').value = '';
      fileInput.value = '';
      showToast('Reklam eklendi');
      loadAds();
    }
  }
}

/** Reklamları yükle */
async function loadAds() {
  const result = await API.get('/ads');
  const list = document.getElementById('adsList');

  if (result.success && result.data.length > 0) {
    list.innerHTML = result.data.map(ad => `
      <div class="list-item">
        <div class="list-item-info">
          <img src="${ad.image_path}" class="list-item-logo" style="border-radius:4px;">
          <div>
            <div class="list-item-name">${ad.title}</div>
            <div class="list-item-sub">${ad.ad_type} ${ad.is_active ? '✅' : '❌'}</div>
          </div>
        </div>
        <div class="list-item-actions">
          <button class="action-btn" onclick="showAd(${ad.id})">📺</button>
          <button class="action-btn warning" onclick="hideAd(${ad.id})">🚫</button>
          <button class="action-btn danger" onclick="deleteAd(${ad.id})">🗑</button>
        </div>
      </div>
    `).join('');
  } else {
    list.innerHTML = '<p class="empty-message">Reklam yok</p>';
  }
}

/** Reklamı göster */
async function showAd(id) {
  await API.post(`/ads/${id}/show`);
  showToast('Reklam yayınlandı');
}

/** Reklamı yayından kaldır */
async function hideAd(id) {
  await API.post(`/ads/${id}/hide`);
  showToast('Reklam yayından kaldırıldı');
  loadAds();
}

/** Reklamı sil */
async function deleteAd(id) {
  if (!confirm('Bu reklamı silmek istediğinize emin misiniz?')) return;
  const result = await API.delete(`/ads/${id}`);
  if (result && result.success !== false) {
    showToast('Reklam silindi');
    loadAds();
  } else {
    showToast(result?.message || 'Reklam silinemedi', true);
  }
}

// ============================================
// TOAST MESAJLAR
// ============================================
function showToast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
