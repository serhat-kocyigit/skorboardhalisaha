/**
 * Match Model - Maç veritabanı işlemleri
 */
const { pool } = require('../config/db');

const Match = {
  /**
   * Tüm maçları takım bilgileriyle birlikte getirir
   */
  async getAll() {
    const [rows] = await pool.query(`
      SELECT m.*, 
             th.name as home_name, th.logo as home_logo, th.color_primary as home_color,
             ta.name as away_name, ta.logo as away_logo, ta.color_primary as away_color
      FROM matches m
      LEFT JOIN teams th ON m.team_home_id = th.id
      LEFT JOIN teams ta ON m.team_away_id = ta.id
      ORDER BY m.created_at DESC
    `);
    return rows;
  },

  /**
   * Aktif (bitmemiş) maçı getirir
   */
  async getActive() {
    const [rows] = await pool.query(`
      SELECT m.*, 
             th.name as home_name, th.logo as home_logo, th.color_primary as home_color,
             th.color_secondary as home_color_secondary,
             ta.name as away_name, ta.logo as away_logo, ta.color_primary as away_color,
             ta.color_secondary as away_color_secondary
      FROM matches m
      LEFT JOIN teams th ON m.team_home_id = th.id
      LEFT JOIN teams ta ON m.team_away_id = ta.id
      WHERE m.status != 'finished'
      ORDER BY m.created_at DESC
      LIMIT 1
    `);
    return rows[0] || null;
  },

  /**
   * Aktif maç yoksa Serbest/Standby modu maçı bulur veya oluşturur
   */
  async getOrEnsureStandby() {
    let match = await this.getActive();
    if (match) return match;

    const Team = require('./Team');
    const teams = await Team.getAll();
    let homeTeam = teams.find(t => t.name.toLowerCase().includes('ev sahibi') || t.name.toLowerCase() === 'takım a');
    let awayTeam = teams.find(t => t.name.toLowerCase().includes('deplasman') || t.name.toLowerCase() === 'takım b');

    if (!homeTeam) {
      homeTeam = await Team.create({ name: 'Ev Sahibi', color_primary: '#00ff88', color_secondary: '#0a0a2e' });
    }
    if (!awayTeam || awayTeam.id === homeTeam.id) {
      awayTeam = await Team.create({ name: 'Deplasman', color_primary: '#4C9AFF', color_secondary: '#0a0a2e' });
    }

    const [result] = await pool.query(
      'INSERT INTO matches (team_home_id, team_away_id, period_duration, extra_time_duration, status) VALUES (?, ?, ?, ?, ?)',
      [homeTeam.id, awayTeam.id, 3600, 300, 'pending']
    );
    return this.getById(result.insertId);
  },

  /**
   * ID ile maç getirir
   */
  async getById(id) {
    const [rows] = await pool.query(`
      SELECT m.*, 
             th.name as home_name, th.logo as home_logo, th.color_primary as home_color,
             th.color_secondary as home_color_secondary,
             ta.name as away_name, ta.logo as away_logo, ta.color_primary as away_color,
             ta.color_secondary as away_color_secondary
      FROM matches m
      LEFT JOIN teams th ON m.team_home_id = th.id
      LEFT JOIN teams ta ON m.team_away_id = ta.id
      WHERE m.id = ?
    `, [id]);
    return rows[0] || null;
  },

  /**
   * Yeni maç oluşturur
   */
  async create(data) {
    const { team_home_id, team_away_id, period_duration = 600, extra_time_duration = 300, match_date } = data;
    const [result] = await pool.query(
      'INSERT INTO matches (team_home_id, team_away_id, period_duration, extra_time_duration, match_date) VALUES (?, ?, ?, ?, ?)',
      [team_home_id, team_away_id, period_duration, extra_time_duration, match_date || new Date()]
    );
    return this.getById(result.insertId);
  },

  /**
   * Maç durumunu günceller
   */
  async updateStatus(id, status, currentPeriod = null) {
    const fields = ['status = ?'];
    const values = [status];
    if (currentPeriod) {
      fields.push('current_period = ?');
      values.push(currentPeriod);
    }
    values.push(id);
    await pool.query(`UPDATE matches SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  /**
   * Skoru günceller
   */
  async updateScore(id, scoreHome, scoreAway) {
    await pool.query(
      'UPDATE matches SET score_home = ?, score_away = ? WHERE id = ?',
      [scoreHome, scoreAway, id]
    );
    return this.getById(id);
  },

  /**
   * Takımları günceller/atar
   */
  async updateTeams(id, teamHomeId, teamAwayId) {
    await pool.query(
      'UPDATE matches SET team_home_id = ?, team_away_id = ? WHERE id = ?',
      [teamHomeId, teamAwayId, id]
    );
    return this.getById(id);
  },

  /**
   * Geçen süreyi günceller
   */
  async updateElapsed(id, elapsedSeconds) {
    await pool.query(
      'UPDATE matches SET elapsed_seconds = ? WHERE id = ?',
      [elapsedSeconds, id]
    );
  },

  /**
   * Maçı sıfırlar (autoStart=true ise direkt first_half başlatır, hakem beklenmez)
   */
  async reset(id, autoStart = false) {
    const newStatus = autoStart ? 'first_half' : 'pending';
    await pool.query(`
      UPDATE matches SET score_home = 0, score_away = 0, elapsed_seconds = 0, 
      status = ?, current_period = 'first_half' WHERE id = ?
    `, [newStatus, id]);
    // İlgili gol ve kartları da sil
    await pool.query('DELETE FROM goals WHERE match_id = ?', [id]);
    await pool.query('DELETE FROM cards WHERE match_id = ?', [id]);
    return this.getById(id);
  },

  /**
   * Serbest Mod (standby) maçını sıfırlar ve durumunu standby olarak korur
   */
  async resetStandby(id) {
    await pool.query(`
      UPDATE matches SET score_home = 0, score_away = 0, elapsed_seconds = 0, 
      status = 'pending', current_period = 'first_half' WHERE id = ?
    `, [id]);
    await pool.query('DELETE FROM goals WHERE match_id = ?', [id]);
    await pool.query('DELETE FROM cards WHERE match_id = ?', [id]);
    return this.getById(id);
  },

  /**
   * Maçı siler
   */
  async delete(id) {
    const [result] = await pool.query('DELETE FROM matches WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Match;
