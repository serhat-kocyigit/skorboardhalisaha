/**
 * Match Socket Handler
 * Maç socket event'leri
 */

const Match = require('../models/Match');
const Goal = require('../models/Goal');
const Card = require('../models/Card');
const Layout = require('../models/Layout');
const Settings = require('../models/Settings');
const Ad = require('../models/Ad');


module.exports = function (io, socket) {

  /**
   * =========================================================
   * TAM STATE SENKRONİZASYONU
   * =========================================================
   *
   * Scoreboard / TV ekranı bağlandığında:
   *
   * socket.emit('match:requestSync')
   *
   * gönderir.
   *
   * Burada:
   * - Aktif maç
   * - Gol
   * - Kart
   * - Layout
   * - Ayarlar
   * - Aktif reklam
   *
   * tek paket halinde client'a gönderilir.
   */
  socket.on('match:requestSync', async () => {

    try {

      // =====================================================
      // AKTİF MAÇ
      // =====================================================

      let match = await Match.getActive();


      /**
       * Aktif maç yoksa standby maç oluştur / getir.
       */
      if (!match) {

        match =
          await Match.getOrEnsureStandby();

      }


      // =====================================================
      // MAÇ VERİLERİ
      // =====================================================

      const goals =
        match
          ? await Goal.getByMatchId(
            match.id
          )
          : [];


      const cards =
        match
          ? await Card.getByMatchId(
            match.id
          )
          : [];


      const lastGoal =
        match
          ? await Goal.getLastGoal(
            match.id
          )
          : null;


      // =====================================================
      // EV SAHİBİ KART SAYISI
      // =====================================================

      const homeCards =
        (
          match &&
          match.team_home_id
        )
          ? await Card.getCountByTeam(
            match.id,
            match.team_home_id
          )
          : {
            yellow_count: 0,
            red_count: 0
          };


      // =====================================================
      // DEPLASMAN KART SAYISI
      // =====================================================

      const awayCards =
        (
          match &&
          match.team_away_id
        )
          ? await Card.getCountByTeam(
            match.id,
            match.team_away_id
          )
          : {
            yellow_count: 0,
            red_count: 0
          };


      // =====================================================
      // LAYOUT
      // =====================================================

      const layout =
        await Layout.getActive();


      // =====================================================
      // AYARLAR
      // =====================================================

      const settings =
        await Settings.get();


      // =====================================================
      // AKTİF REKLAM
      // =====================================================

      /**
       * BURASI KRİTİK.
       *
       * Öncelikle runtime'da gerçekten yayında olan
       * reklamı alıyoruz.
       *
       * Reklam gösterildiğinde:
       *
       * Ad.setActiveDisplayAd(ad)
       *
       * ile burada tutuluyor.
       */
      let activeAd =
        Ad.currentActiveAd || null;


      /**
       * Runtime state boşsa:
       *
       * Örneğin:
       * - Server yeniden başladıysa
       * - RAM state henüz oluşmadıysa
       *
       * Veritabanındaki aktif reklama bak.
       */
      if (!activeAd) {

        const activeAds =
          await Ad.getActive();


        if (
          activeAds &&
          activeAds.length > 0
        ) {

          activeAd =
            activeAds[0];


          /**
           * Runtime state'i tekrar oluştur.
           */
          if (
            typeof Ad.setActiveDisplayAd ===
            'function'
          ) {

            Ad.setActiveDisplayAd(
              activeAd
            );

          }

        }

      }


      // =====================================================
      // DEBUG
      // =====================================================

      if (activeAd) {

        console.log(
          '📺 STATE SYNC - Aktif reklam:',
          {
            id:
              activeAd.id,

            title:
              activeAd.title,

            type:
              activeAd.ad_type,

            image:
              activeAd.image_path
          }
        );

      } else {

        console.log(
          '📺 STATE SYNC - Aktif reklam yok'
        );

      }


      // =====================================================
      // CLIENT'A STATE GÖNDER
      // =====================================================

      socket.emit(
        'match:stateSync',
        {

          /**
           * Maç bilgisi
           */
          match:
            match
              ? {
                ...match,

                goals,

                cards,

                lastGoal,

                homeCards,

                awayCards
              }
              : null,


          /**
           * Scoreboard layout
           */
          layout,


          /**
           * Genel ayarlar
           */
          settings,


          /**
           * TV'de gösterilecek aktif reklam
           */
          activeAd

        }
      );


      // =====================================================
      // DEBUG
      // =====================================================

      console.log(
        `🔄 State Sync gönderildi → Socket: ${socket.id}`
      );


    } catch (error) {

      console.error(
        '❌ match:requestSync hatası:',
        error
      );

    }

  });

};