/**
 * Ad Model - Reklam veritabanı işlemleri
 */
const { pool } = require('../config/db');

const Ad = {
  /**
   * Tüm reklamları getirir
   */
  async getAll() {
    const [rows] = await pool.query('SELECT * FROM ads ORDER BY display_order ASC');
    return rows;
  },

  /**
   * Aktif reklamları getirir
   */
  async getActive() {
    const [rows] = await pool.query(
      'SELECT * FROM ads WHERE is_active = 1 ORDER BY display_order ASC'
    );
    return rows;
  },

  /**
   * ID ile reklam getirir
   */
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM ads WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /**
   * Yeni reklam ekler
   */
  async create(data) {
    const { title, image_path, ad_type = 'banner', is_active = 1, display_order = 0 } = data;
    const duration_seconds = data.duration_seconds !== undefined ? data.duration_seconds : (ad_type === 'banner' ? 0 : 10);
    const [result] = await pool.query(
      'INSERT INTO ads (title, image_path, ad_type, is_active, display_order, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)',
      [title, image_path, ad_type, is_active, display_order, duration_seconds]
    );
    return this.getById(result.insertId);
  },

  /**
   * Reklamı günceller
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    const allowedFields = ['title', 'image_path', 'ad_type', 'is_active', 'display_order', 'duration_seconds'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await pool.query(`UPDATE ads SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  /**
   * Reklamı siler
   */
  async delete(id) {
    const [result] = await pool.query('DELETE FROM ads WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // Bellekteki o an yayınlanan aktif reklam referansı
  currentActiveAd: null,

  /** O an yayında olan aktif reklamı ayarla */
  setActiveDisplayAd(ad) {
    this.currentActiveAd = ad || null;
  },

  /** O an yayında olan aktif reklamı getir */
  getActiveDisplayAd() {
    return this.currentActiveAd || null;
  }
};

module.exports = Ad;
