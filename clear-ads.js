/**
 * Tüm reklamları temizleme script'i
 */
require('dotenv').config();
const { pool } = require('./server/config/db');

async function clearAds() {
  try {
    const [result] = await pool.query('DELETE FROM ads');
    console.log(`✅ ${result.affectedRows} reklam silindi`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

clearAds();
