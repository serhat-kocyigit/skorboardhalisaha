/**
 * Goal Model - Gol veritabanı işlemleri
 * DÜZELTİLDİ: team_name CASE sorgusu — artık gerçek takım adını döndürüyor
 */
const { pool } = require('../config/db');

// Tekrarlanan SQL parçasını bir kez tanımla
const GOAL_SELECT = `
  SELECT g.*, p.name as player_name, p.jersey_number,
         CASE
           WHEN g.team_id = m.team_home_id THEN COALESCE(t.name, 'Ev Sahibi')
           WHEN g.team_id = m.team_away_id THEN COALESCE(t.name, 'Deplasman')
           ELSE COALESCE(t.name, 'Bilinmeyen Takım')
         END as team_name
  FROM goals g
  LEFT JOIN matches m  ON g.match_id = m.id
  LEFT JOIN players p  ON g.player_id = p.id
  LEFT JOIN teams t    ON g.team_id   = t.id
`;

const Goal = {
  /** Maça ait tüm golleri getirir */
  async getByMatchId(matchId) {
    const [rows] = await pool.query(
      `${GOAL_SELECT} WHERE g.match_id = ? ORDER BY g.created_at ASC`,
      [matchId]
    );
    return rows;
  },

  /** Son golü getirir */
  async getLastGoal(matchId) {
    const [rows] = await pool.query(
      `${GOAL_SELECT} WHERE g.match_id = ? ORDER BY g.created_at DESC LIMIT 1`,
      [matchId]
    );
    return rows[0] || null;
  },

  /** Gol kaydeder */
  async create(data) {
    const { match_id, team_id, player_id = null, minute = 0, period = 'first_half' } = data;
    const [result] = await pool.query(
      'INSERT INTO goals (match_id, team_id, player_id, minute, period) VALUES (?, ?, ?, ?, ?)',
      [match_id, team_id, player_id, minute, period]
    );
    const [rows] = await pool.query(
      `${GOAL_SELECT} WHERE g.id = ?`,
      [result.insertId]
    );
    return rows[0];
  },

  /** Son golü siler (geri alma) */
  async deleteLast(matchId, teamId) {
    const [rows] = await pool.query(
      'SELECT id FROM goals WHERE match_id = ? AND team_id = ? ORDER BY created_at DESC LIMIT 1',
      [matchId, teamId]
    );
    if (rows.length > 0) {
      await pool.query('DELETE FROM goals WHERE id = ?', [rows[0].id]);
      return true;
    }
    return false;
  }
};

module.exports = Goal;
