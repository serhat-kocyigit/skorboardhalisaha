/**
 * Ad Controller - Reklam yönetim işlemleri
 */
const Ad = require('../models/Ad');

const adController = {

  async getAll(req, res) {
    try {

      const ads = await Ad.getAll();

      res.json({
        success: true,
        data: ads
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  },


  async create(req, res) {
    try {

      const {
        title,
        image_path
      } = req.body;


      if (!title || !image_path) {

        return res.status(400).json({
          success: false,
          message: 'Başlık ve görsel zorunludur'
        });

      }


      const ad =
        await Ad.create(req.body);


      res.status(201).json({
        success: true,
        data: ad
      });


    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  },


  async update(req, res) {
    try {

      const ad =
        await Ad.update(
          req.params.id,
          req.body
        );


      if (!ad) {

        return res.status(404).json({
          success: false,
          message: 'Reklam bulunamadı'
        });

      }


      res.json({
        success: true,
        data: ad
      });


    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  },


  async delete(req, res) {
    try {

      const ad =
        await Ad.getById(
          req.params.id
        );


      if (!ad) {

        return res.status(404).json({
          success: false,
          message: 'Reklam bulunamadı'
        });

      }


      const deleted =
        await Ad.delete(
          req.params.id
        );


      if (!deleted) {

        return res.status(404).json({
          success: false,
          message: 'Reklam silinemedi'
        });

      }


      /*
       * Silinen reklam şu anda yayındaysa
       * runtime state'i temizle.
       */
      const currentAd =
        Ad.getActiveDisplayAd();


      if (
        currentAd &&
        String(currentAd.id) === String(ad.id)
      ) {

        Ad.setActiveDisplayAd(null);


        const io =
          req.app.get('io');


        if (io) {
          io.emit('ad:hide');
        }
      }


      res.json({
        success: true,
        message: 'Reklam silindi'
      });


    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  },


  /**
   * Reklamı scoreboard'da göster
   */
  async showAd(req, res) {
    try {

      const id =
        req.params.id;


      let ad =
        await Ad.getById(id);


      if (!ad) {

        return res.status(404).json({
          success: false,
          message: 'Reklam bulunamadı'
        });

      }


      /*
       * ---------------------------------------------
       * Diğer reklamları pasif yap
       * ---------------------------------------------
       */
      const allAds =
        await Ad.getAll();


      for (const otherAd of allAds) {

        if (
          String(otherAd.id) !==
          String(id)
        ) {

          await Ad.update(
            otherAd.id,
            {
              is_active: 0
            }
          );

        }

      }


      /*
       * ---------------------------------------------
       * Seçilen reklamı aktif yap
       * ---------------------------------------------
       */
      await Ad.update(
        id,
        {
          is_active: 1
        }
      );


      /*
       * Güncellenmiş reklamı DB'den yeniden çek.
       */
      ad =
        await Ad.getById(id);


      if (!ad) {

        return res.status(404).json({
          success: false,
          message: 'Reklam güncellenemedi'
        });

      }


      /*
       * ---------------------------------------------
       * Runtime aktif reklam
       * ---------------------------------------------
       */
      Ad.setActiveDisplayAd(ad);


      console.log(
        '📺 REKLAM YAYINA ALINDI:',
        {
          id: ad.id,
          title: ad.title,
          type: ad.ad_type,
          image_path: ad.image_path,
          duration_seconds:
            ad.duration_seconds
        }
      );


      /*
       * ---------------------------------------------
       * Socket.IO
       * ---------------------------------------------
       */
      const io =
        req.app.get('io');


      if (io) {

        io.emit(
          'ad:show',
          ad
        );

      }


      /*
       * ---------------------------------------------
       * Önce eski timer'ı temizle
       * ---------------------------------------------
       */
      if (global.adTimeout) {

        clearTimeout(
          global.adTimeout
        );


        global.adTimeout =
          null;

      }


      /*
       * ---------------------------------------------
       * Süreli reklam
       * ---------------------------------------------
       *
       * Banner duration = 0 ise
       * hide butonuna kadar kalır.
       */
      if (
        Number(ad.duration_seconds) > 0
      ) {

        global.adTimeout =
          setTimeout(
            () => {

              /*
               * Arada başka bir reklam açılmış olabilir.
               * Sadece hâlâ aynı reklam yayındaysa kapat.
               */
              const currentAd =
                Ad.getActiveDisplayAd();


              if (
                currentAd &&
                String(currentAd.id) ===
                String(ad.id)
              ) {

                Ad.setActiveDisplayAd(
                  null
                );


                if (io) {

                  io.emit(
                    'ad:hide'
                  );

                }


                console.log(
                  '📺 Reklam süresi doldu:',
                  ad.id
                );

              }

            },

            Number(
              ad.duration_seconds
            ) * 1000
          );

      }


      res.json({
        success: true,
        data: ad
      });


    } catch (error) {

      console.error(
        '❌ showAd hatası:',
        error
      );


      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  },


  /**
   * Reklamı gizle / yayından kaldır
   */
  async hideAd(req, res) {
    try {

      const id =
        req.params.id;


      const ad =
        await Ad.getById(id);


      if (!ad) {

        return res.status(404).json({
          success: false,
          message: 'Reklam bulunamadı'
        });

      }


      /*
       * DB'de pasif
       */
      await Ad.update(
        id,
        {
          is_active: 0
        }
      );


      /*
       * Yalnızca gerçekten bu reklam
       * runtime'da yayındaysa kaldır.
       */
      const currentAd =
        Ad.getActiveDisplayAd();


      if (
        !currentAd ||
        String(currentAd.id) ===
        String(id)
      ) {

        Ad.setActiveDisplayAd(
          null
        );

      }


      /*
       * Timer temizle
       */
      if (global.adTimeout) {

        clearTimeout(
          global.adTimeout
        );


        global.adTimeout =
          null;

      }


      /*
       * Socket
       */
      const io =
        req.app.get('io');


      if (io) {

        io.emit(
          'ad:hide'
        );

      }


      console.log(
        '📺 REKLAM YAYINDAN KALDIRILDI:',
        id
      );


      res.json({
        success: true,
        message:
          'Reklam yayından kaldırıldı'
      });


    } catch (error) {

      console.error(
        '❌ hideAd hatası:',
        error
      );


      res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }

};


module.exports =
  adController;