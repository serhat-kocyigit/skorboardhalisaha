/**
 * Veritabanı Kurulum Script'i
 * MySQL veritabanını ve tablolarını oluşturur
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function setup() {
  console.log('🗄️ Veritabanı kurulumu başlıyor...\n');

  // Önce veritabanı olmadan bağlan
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    // Schema dosyasını oku
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // SQL'i çalıştır
    await connection.query(schema);

    console.log('✅ Veritabanı başarıyla oluşturuldu!');
    console.log('✅ Tablolar oluşturuldu.');
    console.log('✅ Varsayılan veriler eklendi.\n');
    console.log('📋 Oluşturulan tablolar:');
    console.log('   - settings');
    console.log('   - teams');
    console.log('   - players');
    console.log('   - matches');
    console.log('   - goals');
    console.log('   - cards');
    console.log('   - layouts');
    console.log('   - ads\n');
    console.log('🚀 Sunucuyu başlatmak için: npm run dev');
  } catch (error) {
    console.error('❌ Veritabanı kurulum hatası:', error.message);
  } finally {
    await connection.end();
  }
}

setup();
