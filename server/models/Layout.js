/**
 * Layout Model - Skorboard tasarım konfigürasyonları
 */
const { pool } = require('../config/db');

const Layout = {
  /**
   * Tüm layoutları getirir
   */
  async getAll() {
    const [rows] = await pool.query('SELECT * FROM layouts ORDER BY created_at DESC');
    return rows;
  },

  /**
   * Aktif layoutu getirir
   */
  async getActive() {
    const [rows] = await pool.query('SELECT * FROM layouts WHERE is_active = 1 LIMIT 1');
    return rows[0] || null;
  },

  /**
   * ID ile layout getirir
   */
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM layouts WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /**
   * Yeni layout oluşturur
   */
  async create(data) {
    const { name, config } = data;
    const configStr = typeof config === 'string' ? config : JSON.stringify(config);
    const [result] = await pool.query(
      'INSERT INTO layouts (name, config) VALUES (?, ?)',
      [name, configStr]
    );
    return this.getById(result.insertId);
  },

  /**
   * Layout konfigürasyonunu günceller
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.config !== undefined) {
      fields.push('config = ?');
      values.push(typeof data.config === 'string' ? data.config : JSON.stringify(data.config));
    }

    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await pool.query(`UPDATE layouts SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  /**
   * Layoutu aktifleştirir (diğerlerini deaktif yapar)
   */
  async activate(id) {
    await pool.query('UPDATE layouts SET is_active = 0');
    await pool.query('UPDATE layouts SET is_active = 1 WHERE id = ?', [id]);
    return this.getById(id);
  },

  /**
   * Layoutu siler
   */
  async delete(id) {
    const [result] = await pool.query('DELETE FROM layouts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Layout;
