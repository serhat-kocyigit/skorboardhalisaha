/**
 * Scoreboard JavaScript - TV Ekranı
 * Flat absolute layout — editor ile birebir senkronize
 */
document.addEventListener('DOMContentLoaded', () => {

  const els = {
    fieldName: document.getElementById('fieldName'),
    fieldLogo: document.getElementById('fieldLogo'),
    sbFieldInfo: document.getElementById('sbFieldInfo'),

    timerDisplay: document.getElementById('timerDisplay'),
    periodText: document.getElementById('periodText'),
    realTimeClock: document.getElementById('realTimeClock'),

    scoreHome: document.getElementById('scoreHome'),
    scoreAway: document.getElementById('scoreAway'),
    scoreDisplay: document.getElementById('scoreDisplay'),

    homeTeamName: document.getElementById('homeTeamName'),
    awayTeamName: document.getElementById('awayTeamName'),

    homeTeamLogo: document.getElementById('homeTeamLogo'),
    awayTeamLogo: document.getElementById('awayTeamLogo'),

    homeLogoPlaceholder:
      document.getElementById('homeLogoPlaceholder'),

    awayLogoPlaceholder:
      document.getElementById('awayLogoPlaceholder'),

    homeYellowCards:
      document.getElementById('homeYellowCards'),

    homeRedCards:
      document.getElementById('homeRedCards'),

    awayYellowCards:
      document.getElementById('awayYellowCards'),

    awayRedCards:
      document.getElementById('awayRedCards'),

    lastGoalBar:
      document.getElementById('lastGoalBar'),

    lastGoalText:
      document.getElementById('lastGoalText'),

    adBanner:
      document.getElementById('adBanner'),

    adImage:
      document.getElementById('adImage'),

    fullscreenAd:
      document.getElementById('fullscreenAd'),

    fullscreenAdImage:
      document.getElementById('fullscreenAdImage'),

    fullscreenBtn:
      document.getElementById('fullscreenBtn'),

    connectionStatus:
      document.getElementById('connectionStatus'),

    goalSound:
      document.getElementById('goalSound'),

    matchStartSound:
      document.getElementById('matchStartSound')
  };


  // =========================================================
  // MAÇ PERİYOT İSİMLERİ
  // =========================================================

  const periodNames = {
    pending: 'Maç Bekleniyor',
    first_half: '1. Yarı',
    half_time: 'Devre Arası',
    second_half: '2. Yarı',
    extra_time: 'Uzatma',
    finished: 'Maç Bitti'
  };


  // =========================================================
  // REKLAM STATE
  // =========================================================

  let currentAdId = null;
  let currentAdType = null;


  // =========================================================
  // SOCKET
  // =========================================================

  const socket = SocketClient.connect();


  socket.on('connect', () => {

    if (els.connectionStatus) {

      els.connectionStatus.className =
        'connection-status connected';

      const statusText =
        els.connectionStatus.querySelector(
          '.status-text'
        );

      if (statusText) {
        statusText.textContent = 'Bağlı';
      }
    }

  });


  socket.on('disconnect', () => {

    if (els.connectionStatus) {

      els.connectionStatus.className =
        'connection-status disconnected';

      const statusText =
        els.connectionStatus.querySelector(
          '.status-text'
        );

      if (statusText) {
        statusText.textContent =
          'Bağlantı Koptu';
      }
    }

  });


  // =========================================================
  // STATE SYNC
  // =========================================================

  socket.on('match:stateSync', (data) => {

    if (!data) {
      return;
    }


    if (data.settings) {
      updateSettings(
        data.settings
      );
    }


    if (data.match) {
      updateMatch(
        data.match
      );
    }


    if (data.layout) {
      applyLayout(
        data.layout
      );
    }


    /*
     * KRİTİK:
     *
     * Aynı reklam daha önce açılmış olsa bile
     * state sync geldiğinde yeniden uygula.
     *
     * TV tarafında layout reklamı gizlerse
     * burada tekrar görünür hale gelir.
     */
    if (
      data.activeAd !== undefined
    ) {

      if (data.activeAd) {

        showAdOnUI(
          data.activeAd
        );

      } else {

        hideAdOnUI();

      }
    }

  });


  // =========================================================
  // SKOR
  // =========================================================

  socket.on(
    'score:changed',
    (data) => {

      if (!data) {
        return;
      }


      if (data.match) {

        animateScore(
          els.scoreHome,
          data.match.score_home
        );

        animateScore(
          els.scoreAway,
          data.match.score_away
        );
      }


      updateLastGoal(
        data.lastGoal || null
      );

    }
  );


  // =========================================================
  // GOL
  // =========================================================

  socket.on(
    'goal:added',
    (data) => {

      if (!data) {
        return;
      }


      const playerName =
        data.goal?.player_name ||
        null;


      /*
       * İlk tercih backend'den gelen gerçek takım adı.
       *
       * Gelmezse home/away değerine bakıp
       * scoreboard üzerinde görünen isim kullanılır.
       */
      const teamName =
        data.goal?.team_name ||
        (
          data.team === 'home'
            ? els.homeTeamName?.textContent
            : els.awayTeamName?.textContent
        ) ||
        'Takım';


      Animations.showGoalAnimation(
        teamName,
        playerName
      );


      if (data.goal) {

        updateLastGoal(
          data.goal
        );

      }


      if (data.match) {

        animateScore(
          els.scoreHome,
          data.match.score_home
        );


        animateScore(
          els.scoreAway,
          data.match.score_away
        );

      }


      playGoalSound();

    }
  );


  // =========================================================
  // MAÇ SAYACI
  // =========================================================

  socket.on(
    'timer:tick',
    (data) => {

      if (
        !data ||
        !els.timerDisplay
      ) {
        return;
      }


      /*
       * SERBEST MOD
       */
      if (data.isSerbest) {

        els.timerDisplay.innerHTML = `
          <div
            style="
              display:flex;
              flex-direction:column;
              align-items:center;
              line-height:1;
            "
          >

            <span
              style="
                font-size:1em;
              "
            >
              ${data.hour}:${data.minute}
            </span>

            <span
              style="
                font-size:0.45em;
                margin-top:0.1em;
                color:#00ff88;
                letter-spacing:2px;
              "
            >
              :${data.second}
            </span>

          </div>
        `;


        if (els.periodText) {

          els.periodText.textContent =
            'SERBEST MOD';

        }

      }

      /*
       * NORMAL MAÇ
       */
      else {

        els.timerDisplay.textContent =
          data.formatted;

      }


      /*
       * Timer devam ediyorsa pause classını kaldır.
       */
      els.timerDisplay.classList.remove(
        'timer-paused'
      );


      /*
       * Uzatmadaysa kırmızı
       */
      els.timerDisplay.style.color =
        data.isOvertime
          ? '#FF3B3B'
          : '';

    }
  );


  socket.on(
    'timer:paused',
    () => {

      if (els.timerDisplay) {

        els.timerDisplay.classList.add(
          'timer-paused'
        );

      }

    }
  );


  socket.on(
    'timer:reset',
    () => {

      if (!els.timerDisplay) {
        return;
      }


      els.timerDisplay.textContent =
        '00:00';


      els.timerDisplay.style.color =
        '';


      els.timerDisplay.classList.remove(
        'timer-paused'
      );

    }
  );


  socket.on(
    'timer:ended',
    () => {

      if (els.timerDisplay) {

        els.timerDisplay.style.color =
          '#FFD700';

      }

    }
  );


  // =========================================================
  // MAÇ DURUMLARI
  // =========================================================

  socket.on(
    'match:started',
    (match) => {

      updateMatch(match);

      playMatchStartSound();

    }
  );


  socket.on(
    'match:periodChanged',
    (match) => {

      updateMatch(match);

      playMatchStartSound();

    }
  );


  socket.on(
    'match:finished',
    (match) => {

      updateMatch(match);

      playMatchStartSound();

    }
  );


  socket.on(
    'match:created',
    (match) => {

      updateMatch(match);

    }
  );


  socket.on(
    'match:reset',
    (match) => {

      updateMatch(match);


      if (els.lastGoalBar) {

        els.lastGoalBar.style.display =
          'none';

      }

    }
  );


  // =========================================================
  // KARTLAR
  // =========================================================

  socket.on(
    'card:yellow',
    (data) => {

      if (!data) {
        return;
      }


      updateCards(data);


      if (data.card) {

        Animations.showCardAnimation(
          'yellow',
          data.card.player_name
        );

      }

    }
  );


  socket.on(
    'card:red',
    (data) => {

      if (!data) {
        return;
      }


      updateCards(data);


      if (data.card) {

        Animations.showCardAnimation(
          'red',
          data.card.player_name
        );

      }

    }
  );


  // =========================================================
  // LAYOUT
  // =========================================================

  socket.on(
    'layout:updated',
    (layout) => {

      /*
       * Önce layout uygulanır.
       */
      applyLayout(layout);


      /*
       * Layout reklamı gizlediyse
       * aktif reklam tekrar görünür yapılır.
       */
      ensureActiveAdVisible();

    }
  );


  // =========================================================
  // LOGO
  // =========================================================

  socket.on(
    'logo:changed',
    (data) => {

      if (!data) {
        return;
      }


      if (
        data.type === 'field'
      ) {

        setImage(
          els.fieldLogo,
          data.path
        );

      } else {

        socket.emit(
          'match:requestSync'
        );

      }

    }
  );


  // =========================================================
  // AYARLAR
  // =========================================================

  socket.on(
    'settings:updated',
    (settings) => {

      updateSettings(
        settings
      );

    }
  );


  // =========================================================
  // REKLAMLAR
  // =========================================================

  function showAdOnUI(ad) {

    if (!ad) {
      return;
    }


    currentAdId =
      ad.id;


    currentAdType =
      ad.ad_type ||
      'banner';


    console.log(
      '📺 Reklam gösteriliyor:',
      {
        id: currentAdId,
        type: currentAdType,
        path: ad.image_path
      }
    );


    // =====================================================
    // FULLSCREEN REKLAM
    // =====================================================

    if (
      currentAdType ===
      'fullscreen'
    ) {

      /*
       * Banner varsa kapat.
       */
      clearTimeout(
        window.adBannerTimer
      );


      if (els.adBanner) {

        els.adBanner.style.display =
          'none';

      }


      /*
       * Fullscreen elementler bulunamazsa
       * JS tamamen patlamasın.
       */
      if (
        !els.fullscreenAd ||
        !els.fullscreenAdImage
      ) {

        console.error(
          'Fullscreen reklam elementleri bulunamadı.'
        );

        return;

      }


      /*
       * Görseli yükle.
       */
      els.fullscreenAdImage.src =
        ad.image_path;


      /*
       * Görünürlüğü zorla.
       */
      els.fullscreenAd.style.display =
        'flex';

      els.fullscreenAd.style.opacity =
        '1';

      els.fullscreenAd.style.visibility =
        'visible';


      /*
       * Fullscreen reklam için süre.
       *
       * Süre belirtilmemişse 10 saniye.
       */
      const duration =
        ad.duration_seconds > 0
          ? ad.duration_seconds
          : 10;


      clearTimeout(
        window.fullscreenAdTimer
      );


      window.fullscreenAdTimer =
        setTimeout(
          () => {

            els.fullscreenAd.style.display =
              'none';


            /*
             * Arada başka reklam açılmışsa
             * onun state'ini bozma.
             */
            if (
              currentAdId === ad.id
            ) {

              currentAdId =
                null;

              currentAdType =
                null;

            }

          },

          duration * 1000
        );


      return;
    }


    // =====================================================
    // BANNER REKLAM
    // =====================================================

    /*
     * Fullscreen açıksa kapat.
     */
    clearTimeout(
      window.fullscreenAdTimer
    );


    if (els.fullscreenAd) {

      els.fullscreenAd.style.display =
        'none';

    }


    if (
      !els.adBanner ||
      !els.adImage
    ) {

      console.error(
        'Banner reklam elementleri bulunamadı.'
      );

      return;

    }


    /*
     * Reklam görselini ata.
     */
    els.adImage.src =
      ad.image_path;


    /*
     * KRİTİK TV DÜZELTMESİ
     *
     * Layout veya CSS display:none yapmış olsa bile
     * aktif reklam burada yeniden görünür yapılır.
     */
    els.adBanner.style.display =
      'flex';

    els.adBanner.style.opacity =
      '1';

    els.adBanner.style.visibility =
      'visible';


    /*
     * Reklamda süre varsa o süre sonunda kapat.
     *
     * duration_seconds = 0 ise reklam
     * ad:hide eventine kadar açık kalır.
     */
    if (
      ad.duration_seconds > 0
    ) {

      clearTimeout(
        window.adBannerTimer
      );


      window.adBannerTimer =
        setTimeout(
          () => {

            if (els.adBanner) {

              els.adBanner.style.display =
                'none';

            }


            if (
              currentAdId === ad.id
            ) {

              currentAdId =
                null;

              currentAdType =
                null;

            }

          },

          ad.duration_seconds *
          1000
        );

    } else {

      /*
       * Süresiz reklamda eski timer kalmasın.
       */
      clearTimeout(
        window.adBannerTimer
      );

    }

  }


  /**
   * Layout uygulandıktan sonra
   * aktif banner reklamı tekrar görünür tut.
   */
  function ensureActiveAdVisible() {

    /*
     * Aktif reklam yok.
     */
    if (
      currentAdId === null
    ) {

      return;

    }


    /*
     * Aktif reklam fullscreen ise
     * banner'ı açma.
     */
    if (
      currentAdType ===
      'fullscreen'
    ) {

      return;

    }


    if (
      !els.adBanner ||
      !els.adImage
    ) {

      return;

    }


    /*
     * Banner'ın gerçekten bir görseli
     * varsa tekrar görünür yap.
     */
    if (
      els.adImage.getAttribute(
        'src'
      )
    ) {

      els.adBanner.style.display =
        'flex';

      els.adBanner.style.opacity =
        '1';

      els.adBanner.style.visibility =
        'visible';

    }

  }


  /**
   * Bütün reklamları kapat.
   */
  function hideAdOnUI() {

    clearTimeout(
      window.fullscreenAdTimer
    );


    clearTimeout(
      window.adBannerTimer
    );


    if (els.adBanner) {

      els.adBanner.style.display =
        'none';

    }


    if (els.fullscreenAd) {

      els.fullscreenAd.style.display =
        'none';

    }


    currentAdId =
      null;


    currentAdType =
      null;

  }


  socket.on(
    'ad:show',
    (ad) => {

      console.log(
        '📺 ad:show event:',
        ad
      );


      showAdOnUI(ad);

    }
  );


  socket.on(
    'ad:hide',
    () => {

      console.log(
        '📺 ad:hide event'
      );


      hideAdOnUI();

    }
  );


  // =========================================================
  // TAKIM GÜNCELLEMESİ
  // =========================================================

  socket.on(
    'teams:updated',
    () => {

      socket.emit(
        'match:requestSync'
      );

    }
  );


  // =========================================================
  // SESLER
  // =========================================================

  function playGoalSound() {

    if (!els.goalSound) {
      return;
    }


    els.goalSound.currentTime =
      0;


    els.goalSound.volume =
      1.0;


    els.goalSound
      .play()
      .catch(
        (error) => {

          console.log(
            'Gol sesi çalınamadı:',
            error
          );

        }
      );

  }


  function playMatchStartSound() {

    if (!els.matchStartSound) {
      return;
    }


    els.matchStartSound.currentTime =
      0;


    els.matchStartSound.volume =
      1.0;


    els.matchStartSound
      .play()
      .catch(
        (error) => {

          console.log(
            'Maç sesi çalınamadı:',
            error
          );

        }
      );

  }


  // =========================================================
  // GERÇEK SAAT
  // =========================================================

  let clockInterval =
    null;


  function startRealTimeClock() {

    if (clockInterval) {

      clearInterval(
        clockInterval
      );

    }


    updateRealTimeClock();


    clockInterval =
      setInterval(
        updateRealTimeClock,
        1000
      );

  }


  function stopRealTimeClock() {

    if (clockInterval) {

      clearInterval(
        clockInterval
      );


      clockInterval =
        null;

    }


    if (els.realTimeClock) {

      els.realTimeClock.style.display =
        'none';

    }

  }


  function updateRealTimeClock() {

    if (!els.realTimeClock) {
      return;
    }


    const now =
      new Date();


    /*
     * HH:MM:SS
     */
    const timeString =
      now.toLocaleTimeString(
        'tr-TR',
        {
          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          hour12:
            false
        }
      );


    els.realTimeClock.textContent =
      timeString;


    els.realTimeClock.style.display =
      'block';

  }


  // =========================================================
  // MAÇ UI
  // =========================================================

  function updateMatch(match) {

    if (!match) {
      return;
    }


    const isFormal =
      [
        'first_half',
        'half_time',
        'second_half',
        'extra_time'
      ]
        .includes(
          match.status
        );


    /*
     * Takım isimleri
     */
    if (els.homeTeamName) {

      els.homeTeamName.textContent =
        isFormal
          ? (
            match.home_name ||
            'Ev Sahibi'
          )
          : 'Ev Sahibi';

    }


    if (els.awayTeamName) {

      els.awayTeamName.textContent =
        isFormal
          ? (
            match.away_name ||
            'Deplasman'
          )
          : 'Deplasman';

    }


    /*
     * Logolar
     */
    setTeamLogo(
      'home',
      isFormal
        ? match.home_logo
        : null
    );


    setTeamLogo(
      'away',
      isFormal
        ? match.away_logo
        : null
    );


    /*
     * Skorlar
     */
    if (els.scoreHome) {

      els.scoreHome.textContent =
        match.score_home ||
        0;

    }


    if (els.scoreAway) {

      els.scoreAway.textContent =
        match.score_away ||
        0;

    }


    /*
     * Periyot
     */
    if (els.periodText) {

      els.periodText.textContent =
        periodNames[
        match.status
        ] ||
        periodNames[
        match.current_period
        ] ||
        'Bekleniyor';

    }


    /*
     * Gerçek saat yalnızca
     * aktif maç sırasında gösterilir.
     */
    if (
      isFormal &&
      match.status !==
      'half_time'
    ) {

      startRealTimeClock();

    } else {

      stopRealTimeClock();

    }


    /*
     * Ev sahibi kartlar
     */
    if (
      match.homeCards
    ) {

      if (els.homeYellowCards) {

        els.homeYellowCards.textContent =
          `🟡 ${match.homeCards.yellow_count || 0}`;

      }


      if (els.homeRedCards) {

        els.homeRedCards.textContent =
          `🔴 ${match.homeCards.red_count || 0}`;

      }

    }


    /*
     * Deplasman kartlar
     */
    if (
      match.awayCards
    ) {

      if (els.awayYellowCards) {

        els.awayYellowCards.textContent =
          `🟡 ${match.awayCards.yellow_count || 0}`;

      }


      if (els.awayRedCards) {

        els.awayRedCards.textContent =
          `🔴 ${match.awayCards.red_count || 0}`;

      }

    }


    /*
     * Son gol
     */
    updateLastGoal(
      match.lastGoal ||
      null
    );

  }


  // =========================================================
  // AYARLAR UI
  // =========================================================

  function updateSettings(
    settings
  ) {

    if (!settings) {
      return;
    }


    if (
      settings.field_name &&
      els.fieldName
    ) {

      els.fieldName.textContent =
        settings.field_name;

    }


    if (
      settings.field_logo
    ) {

      setImage(
        els.fieldLogo,
        settings.field_logo
      );

    }

  }


  // =========================================================
  // SKOR ANİMASYONU
  // =========================================================

  function animateScore(
    element,
    value
  ) {

    if (!element) {
      return;
    }


    if (
      parseInt(
        element.textContent
      ) !== value
    ) {

      element.textContent =
        value;


      element.classList.add(
        'score-pulse'
      );


      setTimeout(
        () => {

          element.classList.remove(
            'score-pulse'
          );

        },

        800
      );

    }

  }


  // =========================================================
  // KART UI
  // =========================================================

  function updateCards(
    data
  ) {

    if (!data) {
      return;
    }


    if (
      data.homeCards
    ) {

      if (els.homeYellowCards) {

        els.homeYellowCards.textContent =
          `🟡 ${data.homeCards.yellow_count || 0}`;

      }


      if (els.homeRedCards) {

        els.homeRedCards.textContent =
          `🔴 ${data.homeCards.red_count || 0}`;

      }

    }


    if (
      data.awayCards
    ) {

      if (els.awayYellowCards) {

        els.awayYellowCards.textContent =
          `🟡 ${data.awayCards.yellow_count || 0}`;

      }


      if (els.awayRedCards) {

        els.awayRedCards.textContent =
          `🔴 ${data.awayCards.red_count || 0}`;

      }

    }

  }


  // =========================================================
  // SON GOL
  // =========================================================

  function updateLastGoal(
    goal
  ) {

    if (
      !els.lastGoalBar ||
      !els.lastGoalText
    ) {

      return;

    }


    if (!goal) {

      els.lastGoalBar.style.display =
        'none';

      return;

    }


    const date =
      goal.created_at
        ? new Date(
          goal.created_at
        )
        : new Date();


    const clockTime =
      date.toLocaleTimeString(
        'tr-TR',
        {
          timeZone:
            'Europe/Istanbul',

          hour:
            '2-digit',

          minute:
            '2-digit'
        }
      );


    const playerText =
      goal.player_name
        ? `${goal.player_name} (#${goal.jersey_number})`
        : '';


    els.lastGoalText.textContent =
      playerText

        ? `${goal.team_name} | ${playerText} — ${goal.minute}' (${clockTime})`

        : `${goal.team_name} — ${goal.minute}' (${clockTime})`;


    els.lastGoalBar.style.display =
      'flex';

  }


  // =========================================================
  // TAKIM LOGOLARI
  // =========================================================

  function setTeamLogo(
    side,
    logoPath
  ) {

    const logoElement =
      side === 'home'
        ? els.homeTeamLogo
        : els.awayTeamLogo;


    const placeholderElement =
      side === 'home'
        ? els.homeLogoPlaceholder
        : els.awayLogoPlaceholder;


    if (
      !logoElement ||
      !placeholderElement
    ) {

      return;

    }


    if (logoPath) {

      logoElement.src =
        logoPath;


      logoElement.style.display =
        'block';


      placeholderElement.style.display =
        'none';

    } else {

      logoElement.style.display =
        'none';


      placeholderElement.style.display =
        'block';

    }

  }


  // =========================================================
  // GENEL GÖRSEL
  // =========================================================

  function setImage(
    element,
    path
  ) {

    if (
      element &&
      path
    ) {

      element.src =
        path;


      element.style.display =
        'block';

    }

  }


  // =========================================================
  // LAYOUT
  // =========================================================

  /**
   * Layout uygula.
   *
   * Tüm bileşenler scoreboard'un
   * direkt çocuklarıdır.
   */
  function applyLayout(
    layout
  ) {

    if (
      !layout ||
      !layout.config
    ) {

      return;

    }


    let config;


    try {

      config =
        typeof layout.config ===
          'string'

          ? JSON.parse(
            layout.config
          )

          : layout.config;

    } catch (error) {

      console.error(
        'Layout JSON okunamadı:',
        error
      );

      return;

    }


    console.log(
      '✨ Layout uygulanıyor:',
      config
    );


    const componentMap = {

      fieldLogo:
        els.sbFieldInfo,

      period:
        document.getElementById(
          'periodBadge'
        ),

      timer:
        document.getElementById(
          'timerSection'
        ),

      teamHome:
        document.getElementById(
          'teamHome'
        ),

      score:
        els.scoreDisplay,

      teamAway:
        document.getElementById(
          'teamAway'
        ),

      lastGoal:
        els.lastGoalBar,

      adBanner:
        els.adBanner

    };


    Object.entries(
      config
    ).forEach(
      ([key, conf]) => {

        const element =
          componentMap[key];


        if (
          !element ||
          !conf
        ) {

          return;

        }


        /*
         * Pozisyon
         */
        if (
          conf.x !== undefined
        ) {

          element.style.left =
            conf.x + '%';

        }


        if (
          conf.y !== undefined
        ) {

          element.style.top =
            conf.y + '%';

        }


        /*
         * Boyut
         */
        if (
          conf.w !== undefined
        ) {

          element.style.width =
            (
              key === 'adBanner'
                ? 100
                : conf.w
            ) +
            '%';

        }


        if (
          conf.h !== undefined
        ) {

          element.style.height =
            conf.h + '%';

        }


        /*
         * Reklam banner her zaman
         * ekran genişliğinde.
         */
        if (
          key ===
          'adBanner'
        ) {

          element.style.left =
            '0';


          element.style.width =
            '100%';

        }


        /*
         * GÖRÜNÜRLÜK
         */
        if (
          conf.visible ===
          false
        ) {

          /*
           * KRİTİK:
           *
           * Layout reklamı gizli işaretlemiş olsa bile
           * aktif banner varsa TV'de görünür tut.
           */
          if (
            key ===
            'adBanner' &&
            currentAdId !==
            null &&
            currentAdType !==
            'fullscreen'
          ) {

            element.style.display =
              'flex';


            element.style.opacity =
              '1';


            element.style.visibility =
              'visible';

          } else {

            element.style.display =
              'none';

          }

        } else {

          /*
           * Aktif banner reklam
           */
          if (
            key ===
            'adBanner' &&
            currentAdId !==
            null &&
            currentAdType !==
            'fullscreen'
          ) {

            element.style.display =
              'flex';


            element.style.visibility =
              'visible';

          }

          /*
           * Normal component
           */
          else if (
            element.style.display ===
            'none'
          ) {

            element.style.display =
              '';

          }


          element.style.opacity =
            '1';

        }

      }
    );


    /*
     * Layout işlemi tamamlandıktan sonra
     * reklamı son kez kontrol et.
     */
    ensureActiveAdVisible();

  }


  // =========================================================
  // TAM EKRAN
  // =========================================================

  if (els.fullscreenBtn) {

    els.fullscreenBtn.addEventListener(
      'click',
      () => {

        if (
          !document.fullscreenElement
        ) {

          document
            .documentElement
            .requestFullscreen()
            .catch(
              () => { }
            );

        } else {

          document.exitFullscreen();

        }

      }
    );

  }


  /*
   * Fullscreen reklama tıklayınca kapat.
   */
  if (els.fullscreenAd) {

    els.fullscreenAd.addEventListener(
      'click',
      () => {

        els.fullscreenAd.style.display =
          'none';

      }
    );

  }

});