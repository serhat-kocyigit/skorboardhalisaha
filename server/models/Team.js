/**
 * Team Model - Takım veritabanı işlemleri
 */
const { pool } = require('../config/db');

const Team = {
  /**
   * Tüm takımları getirir
   */
  async getAll() {
    const [rows] = await pool.query('SELECT * FROM teams ORDER BY name ASC');
    return rows;
  },

  /**
   * ID ile takım getirir
   */
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM teams WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /**
   * Yeni takım oluşturur
   */
  async create(data) {
    const { name, logo = null, color_primary = '#ffffff', color_secondary = '#000000' } = data;
    const [result] = await pool.query(
      'INSERT INTO teams (name, logo, color_primary, color_secondary) VALUES (?, ?, ?, ?)',
      [name, logo, color_primary, color_secondary]
    );
    return this.getById(result.insertId);
  },

  /**
   * Takımı günceller
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    const allowedFields = ['name', 'logo', 'color_primary', 'color_secondary'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await pool.query(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  /**
   * Takımı siler
   */
  async delete(id) {
    const [result] = await pool.query('DELETE FROM teams WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Team;
