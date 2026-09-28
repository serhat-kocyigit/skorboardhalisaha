/**
 * Card Model - Kart (Sarı/Kırmızı) veritabanı işlemleri
 */
const { pool } = require('../config/db');

const Card = {
  /**
   * Maça ait tüm kartları getirir
   */
  async getByMatchId(matchId) {
    const [rows] = await pool.query(`
      SELECT c.*, p.name as player_name, p.jersey_number, t.name as team_name
      FROM cards c
      LEFT JOIN players p ON c.player_id = p.id
      LEFT JOIN teams t ON c.team_id = t.id
      WHERE c.match_id = ?
      ORDER BY c.created_at ASC
    `, [matchId]);
    return rows;
  },

  /**
   * Maç ve takıma ait kart sayısını getirir
   */
  async getCountByTeam(matchId, teamId) {
    const [rows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN card_type = 'yellow' THEN 1 ELSE 0 END) as yellow_count,
        SUM(CASE WHEN card_type = 'red' THEN 1 ELSE 0 END) as red_count
      FROM cards
      WHERE match_id = ? AND team_id = ?
    `, [matchId, teamId]);
    return rows[0] || { yellow_count: 0, red_count: 0 };
  },

  /**
   * Kart verir
   */
  async create(data) {
    const { match_id, team_id, player_id, card_type, minute = 0, period = 'first_half' } = data;
    const [result] = await pool.query(
      'INSERT INTO cards (match_id, team_id, player_id, card_type, minute, period) VALUES (?, ?, ?, ?, ?, ?)',
      [match_id, team_id, player_id, card_type, minute, period]
    );
    const [rows] = await pool.query(`
      SELECT c.*, p.name as player_name, p.jersey_number, t.name as team_name
      FROM cards c
      LEFT JOIN players p ON c.player_id = p.id
      LEFT JOIN teams t ON c.team_id = t.id
      WHERE c.id = ?
    `, [result.insertId]);
    return rows[0];
  },

  /**
   * Kartı siler
   */
  async delete(id) {
    const [result] = await pool.query('DELETE FROM cards WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Card;
