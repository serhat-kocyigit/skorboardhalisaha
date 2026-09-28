/**
 * Player Model - Oyuncu veritabanı işlemleri
 */
const { pool } = require('../config/db');

const Player = {
  /**
   * Takıma ait tüm oyuncuları getirir
   */
  async getByTeamId(teamId) {
    const [rows] = await pool.query(
      'SELECT * FROM players WHERE team_id = ? ORDER BY jersey_number ASC',
      [teamId]
    );
    return rows;
  },

  /**
   * ID ile oyuncu getirir
   */
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM players WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /**
   * Yeni oyuncu ekler
   */
  async create(data) {
    const { team_id, name, jersey_number, position = 'ortasaha' } = data;
    const [result] = await pool.query(
      'INSERT INTO players (team_id, name, jersey_number, position) VALUES (?, ?, ?, ?)',
      [team_id, name, jersey_number, position]
    );
    return this.getById(result.insertId);
  },

  /**
   * Oyuncuyu günceller
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    const allowedFields = ['name', 'jersey_number', 'position', 'is_active'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await pool.query(`UPDATE players SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  /**
   * Oyuncuyu siler
   */
  async delete(id) {
    const [result] = await pool.query('DELETE FROM players WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Player;
