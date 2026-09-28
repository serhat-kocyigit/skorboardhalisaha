/**
 * Express Application Setup
 * Tüm middleware, route ve static file konfigürasyonunu içerir
 */
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Route modülleri
const matchRoutes = require('./routes/matchRoutes');
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const cardRoutes = require('./routes/cardRoutes');
const layoutRoutes = require('./routes/layoutRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adRoutes = require('./routes/adRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// STATIC FILES
// ============================================

// Yüklenen dosyalar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Frontend sayfaları
app.use('/scoreboard', express.static(path.join(__dirname, '..', 'client', 'scoreboard')));
app.use('/referee', express.static(path.join(__dirname, '..', 'client', 'referee')));
app.use('/editor', express.static(path.join(__dirname, '..', 'client', 'editor')));
app.use('/tablet', express.static(path.join(__dirname, '..', 'client', 'tablet')));
app.use('/shared', express.static(path.join(__dirname, '..', 'client', 'shared')));
app.use('/assets', express.static(path.join(__dirname, '..', 'client', 'assets')));

// ============================================
// API ROUTES
// ============================================
app.use('/api/matches', matchRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api', playerRoutes);
app.use('/api/matches', scoreRoutes);
app.use('/api/matches', cardRoutes);
app.use('/api/layouts', layoutRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/settings', settingsRoutes);

// ============================================
// ESP32 ENDPOINT (Donanım butonları)
// ============================================
const scoreController = require('./controllers/scoreController');
app.get('/api/esp32/score', scoreController.handleEsp32Score);

// ============================================
// ANA SAYFA YÖNLENDİRME
// ============================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Halı Saha Skorboard</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', sans-serif; 
          background: linear-gradient(135deg, #0a0a2e, #1a1a4e);
          color: #fff; min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
        }
        .container { text-align: center; }
        h1 { font-size: 2.5rem; margin-bottom: 2rem; color: #00ff88; }
        .links { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
        a { 
          display: inline-block; padding: 1rem 2rem;
          background: rgba(0,255,136,0.1); border: 1px solid #00ff88;
          color: #00ff88; text-decoration: none; border-radius: 12px;
          font-size: 1.1rem; transition: all 0.3s;
        }
        a:hover { background: #00ff88; color: #0a0a2e; transform: translateY(-2px); }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚽ Halı Saha Skorboard</h1>
        <div class="links">
          <a href="/scoreboard/">📺 Skorboard (TV)</a>
          <a href="/referee/">📱 Hakem Paneli</a>
          <a href="/editor/">🎨 Tasarım Editörü</a>
          <a href="/tablet/">📊 Tablet Skor</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ============================================
// HATA YÖNETİMİ
// ============================================
app.use(errorHandler);

module.exports = app;
