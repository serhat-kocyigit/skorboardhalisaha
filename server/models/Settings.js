/**
 * Settings Model - Halı saha genel ayarları
 */
const { pool } = require('../config/db');

const Settings = {
  /**
   * Ayarları getirir (tek kayıt)
   */
  async get() {
    const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
    return rows[0] || null;
  },

  /**
   * Ayarları günceller
   */
  async update(data) {
    const fields = [];
    const values = [];
    const allowedFields = ['field_name', 'field_logo', 'field_address', 'primary_color', 'secondary_color'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return this.get();
    
    // İlk kaydı güncelle
    const settings = await this.get();
    if (settings) {
      values.push(settings.id);
      await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return this.get();
  }
};

module.exports = Settings;
