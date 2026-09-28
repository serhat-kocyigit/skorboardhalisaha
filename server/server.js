/**
 * Server Entry Point
 * HTTP sunucusu ve Socket.IO başlatıcı
 */
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { testConnection } = require('./config/db');
const { initializeSocket } = require('./config/socket');
const timerController = require('./controllers/timerController');
const Ad = require('./models/Ad');

const PORT = process.env.PORT || 3000;

// HTTP sunucusu oluştur
const server = http.createServer(app);

// Socket.IO başlat
const io = initializeSocket(server);

// io referansını Express app'e bağla (controller'lardan erişim için)
app.set('io', io);

// Sunucuyu başlat
async function start() {
  // Veritabanı bağlantısını test et
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('⚠️ MySQL bağlantısı kurulamadı. Veritabanı olmadan devam ediliyor...');
  }

  // Aktif reklamları veritabanından yükle
  if (dbConnected) {
    try {
      const activeAds = await Ad.getActive();
      if (activeAds.length > 0) {
        // Sadece ilk aktif reklamı belleğe yükle
        Ad.setActiveDisplayAd(activeAds[0]);
        console.log('📺 Aktif reklam yüklendi:', activeAds[0].title);
      }
    } catch (err) {
      console.warn('⚠️ Reklam yüklenirken hata:', err.message);
    }
  }

  server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║      ⚽ HALI SAHA SKORBOARD SİSTEMİ         ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  🌐 Sunucu: http://localhost:${PORT}            ║`);
    console.log(`║  📺 Skorboard: http://localhost:${PORT}/scoreboard ║`);
    console.log(`║  📱 Hakem: http://localhost:${PORT}/referee       ║`);
    console.log(`║  🎨 Editör: http://localhost:${PORT}/editor       ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    // Her saniye Türkiye saatine göre saat başı kontrolü yap
    setInterval(() => {
      timerController.checkHourlyReset(io);
    }, 1000);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Sunucu kapatılıyor...');
  timerController.cleanup();
  server.close(() => {
    console.log('Sunucu kapatıldı.');
    process.exit(0);
  });
});

start();
