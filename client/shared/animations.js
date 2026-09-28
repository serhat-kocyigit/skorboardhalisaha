/**
 * Ortak Animasyonlar
 * Gol, kart ve genel UI animasyonları
 */
const Animations = {

  /**
   * Gol animasyonu
   *
   * Kullanım:
   * Animations.showGoalAnimation("Galatasaray", "Icardi");
   *
   * Eski kullanım da desteklenir:
   * Animations.showGoalAnimation("home", "Icardi");
   */
  showGoalAnimation(team, playerName, teamName = null) {

    let resolvedTeamName = teamName || null;

    // ------------------------------------------------
    // 1. team parametresi zaten gerçek takım adıysa
    // ------------------------------------------------
    if (
      !resolvedTeamName &&
      team &&
      team !== 'home' &&
      team !== 'away'
    ) {
      resolvedTeamName = team;
    }


    // ------------------------------------------------
    // 2. Scoreboard ekranındaki takım isimlerinden bul
    // ------------------------------------------------
    if (!resolvedTeamName && team === 'home') {
      const homeTeamElement = document.getElementById('homeTeamName');

      if (
        homeTeamElement &&
        homeTeamElement.textContent &&
        homeTeamElement.textContent.trim()
      ) {
        resolvedTeamName = homeTeamElement.textContent.trim();
      }
    }

    if (!resolvedTeamName && team === 'away') {
      const awayTeamElement = document.getElementById('awayTeamName');

      if (
        awayTeamElement &&
        awayTeamElement.textContent &&
        awayTeamElement.textContent.trim()
      ) {
        resolvedTeamName = awayTeamElement.textContent.trim();
      }
    }


    // ------------------------------------------------
    // 3. currentMatch varsa oradan bul
    // Hakem paneli vb. ekranlar için fallback
    // ------------------------------------------------
    if (
      !resolvedTeamName &&
      typeof currentMatch !== 'undefined' &&
      currentMatch
    ) {
      if (team === 'home') {
        resolvedTeamName = currentMatch.home_name;
      }

      if (team === 'away') {
        resolvedTeamName = currentMatch.away_name;
      }
    }


    // ------------------------------------------------
    // 4. Hiçbir şekilde takım adı bulunamadıysa
    // ------------------------------------------------
    if (!resolvedTeamName) {
      if (team === 'home') {
        resolvedTeamName = 'Ev Sahibi';
      } else if (team === 'away') {
        resolvedTeamName = 'Deplasman';
      } else {
        resolvedTeamName = 'Takım';
      }
    }


    // ------------------------------------------------
    // Önceden açık gol animasyonu varsa kaldır
    // ------------------------------------------------
    const oldOverlay = document.querySelector(
      '.goal-animation-overlay'
    );

    if (oldOverlay) {
      oldOverlay.remove();
    }


    // ------------------------------------------------
    // Gol overlay oluştur
    // ------------------------------------------------
    const overlay = document.createElement('div');

    overlay.className = 'goal-animation-overlay';

    overlay.innerHTML = `
      <div class="goal-animation-content">

        <div class="goal-text">
          ⚽ GOOOL!
        </div>

        <div class="goal-team">
          ${resolvedTeamName}
        </div>

        ${playerName
        ? `
              <div class="goal-player">
                ${playerName}
              </div>
            `
        : ''
      }

      </div>

      <div
        class="goal-particles"
        id="goalParticles">
      </div>
    `;


    // ------------------------------------------------
    // Sayfaya ekle
    // ------------------------------------------------
    document.body.appendChild(overlay);


    // ------------------------------------------------
    // Parçacık efekti
    // ------------------------------------------------
    const particlesContainer =
      overlay.querySelector('#goalParticles');

    this.createParticles(particlesContainer);


    // ------------------------------------------------
    // Skor büyütme efekti
    // ------------------------------------------------
    const scoreEl =
      document.querySelector('.score-display');

    if (scoreEl) {

      scoreEl.classList.remove('score-pulse');

      // Animasyonu yeniden tetiklemek için
      void scoreEl.offsetWidth;

      scoreEl.classList.add('score-pulse');

      setTimeout(() => {
        scoreEl.classList.remove('score-pulse');
      }, 1500);
    }


    // ------------------------------------------------
    // 4 saniye sonra animasyonu kapat
    // ------------------------------------------------
    setTimeout(() => {

      if (!overlay.isConnected) {
        return;
      }

      overlay.classList.add(
        'goal-animation-exit'
      );

      setTimeout(() => {

        if (overlay.isConnected) {
          overlay.remove();
        }

      }, 500);

    }, 4000);
  },


  /**
   * Kart animasyonu
   */
  showCardAnimation(cardType, playerName) {

    const card =
      document.createElement('div');

    card.className =
      `card-animation card-${cardType}`;

    card.innerHTML = `
      <div class="card-visual"></div>

      <div class="card-info">
        ${playerName || ''}
      </div>
    `;

    document.body.appendChild(card);


    // 3 saniye sonra kaldır
    setTimeout(() => {

      if (!card.isConnected) {
        return;
      }

      card.classList.add(
        'card-animation-exit'
      );

      setTimeout(() => {

        if (card.isConnected) {
          card.remove();
        }

      }, 500);

    }, 3000);
  },


  /**
   * Parçacık efekti
   */
  createParticles(container) {

    if (!container) {
      return;
    }

    const colors = [
      '#FFD700',
      '#00ff88',
      '#ff6b6b',
      '#4ecdc4',
      '#ffffff'
    ];


    for (let i = 0; i < 50; i++) {

      const particle =
        document.createElement('div');

      particle.className = 'particle';


      const randomColor =
        colors[
        Math.floor(
          Math.random() * colors.length
        )
        ];


      particle.style.cssText = `
        left: ${Math.random() * 100}%;

        top: ${Math.random() * 100}%;

        background: ${randomColor};

        animation-delay:
          ${Math.random() * 0.5}s;

        animation-duration:
          ${1 + Math.random() * 2}s;
      `;


      container.appendChild(particle);
    }
  },


  /**
   * Ses çal
   *
   * Eski ses sistemi devre dışı.
   * Gol sesi scoreboard.js tarafından yönetiliyor.
   */
  playSound(type) {
    return;
  }

};