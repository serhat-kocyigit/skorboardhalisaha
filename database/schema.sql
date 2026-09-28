-- ============================================
-- HALI SAHA SKORBOARD SİSTEMİ
-- Veritabanı Şeması
-- ============================================

CREATE DATABASE IF NOT EXISTS halisaha_scoreboard
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE halisaha_scoreboard;

-- ============================================
-- SAHA AYARLARI
-- Halı saha genel bilgileri (tek saha)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_name VARCHAR(100) NOT NULL DEFAULT 'Halı Saha',
  field_logo VARCHAR(255) DEFAULT NULL,
  field_address VARCHAR(255) DEFAULT NULL,
  primary_color VARCHAR(7) DEFAULT '#00ff88',
  secondary_color VARCHAR(7) DEFAULT '#0a0a2e',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TAKIMLAR
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo VARCHAR(255) DEFAULT NULL,
  color_primary VARCHAR(7) DEFAULT '#ffffff',
  color_secondary VARCHAR(7) DEFAULT '#000000',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- OYUNCULAR
-- Her oyuncu bir takıma bağlı
-- ============================================
CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  jersey_number INT NOT NULL,
  position ENUM('kaleci', 'defans', 'ortasaha', 'forvet') DEFAULT 'ortasaha',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE KEY unique_jersey (team_id, jersey_number)
) ENGINE=InnoDB;

-- ============================================
-- MAÇLAR
-- Tek saha, tek aktif maç
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_home_id INT NOT NULL,
  team_away_id INT NOT NULL,
  score_home INT DEFAULT 0,
  score_away INT DEFAULT 0,
  status ENUM('pending', 'first_half', 'half_time', 'second_half', 'extra_time', 'finished') DEFAULT 'pending',
  period_duration INT DEFAULT 600 COMMENT 'Devre süresi saniye cinsinden (varsayılan 10 dakika)',
  extra_time_duration INT DEFAULT 300 COMMENT 'Uzatma süresi saniye cinsinden',
  current_period VARCHAR(20) DEFAULT 'first_half',
  elapsed_seconds INT DEFAULT 0 COMMENT 'Geçen süre saniye cinsinden',
  layout_id INT DEFAULT NULL,
  match_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (team_home_id) REFERENCES teams(id) ON DELETE RESTRICT,
  FOREIGN KEY (team_away_id) REFERENCES teams(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- GOLLER
-- Her gol bir maça, takıma ve opsiyonel oyuncuya bağlı
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  team_id INT NOT NULL,
  player_id INT DEFAULT NULL,
  minute INT DEFAULT 0 COMMENT 'Golün dakikası',
  period VARCHAR(20) DEFAULT 'first_half',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- KARTLAR
-- Sarı / Kırmızı kart kayıtları
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  team_id INT NOT NULL,
  player_id INT NOT NULL,
  card_type ENUM('yellow', 'red') NOT NULL,
  minute INT DEFAULT 0,
  period VARCHAR(20) DEFAULT 'first_half',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- SKORBOARD TASARIMLARI (LAYOUT)
-- Drag & Drop editör konfigürasyonları
-- ============================================
CREATE TABLE IF NOT EXISTS layouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL DEFAULT 'Varsayılan',
  config JSON NOT NULL,
  is_active TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- REKLAMLAR
-- Alt bant veya tam ekran reklamlar
-- ============================================
CREATE TABLE IF NOT EXISTS ads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  ad_type ENUM('banner', 'fullscreen') DEFAULT 'banner',
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  duration_seconds INT DEFAULT 10 COMMENT 'Reklam gösterim süresi',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- VARSAYILAN VERİLER
-- ============================================

-- Varsayılan saha ayarları
INSERT INTO settings (field_name, primary_color, secondary_color) 
VALUES ('Halı Saha', '#00ff88', '#0a0a2e');

-- Varsayılan layout
INSERT INTO layouts (name, config, is_active) VALUES (
  'Varsayılan',
  '{
    "score": {"x": 50, "y": 30, "width": 400, "height": 200, "visible": true},
    "timer": {"x": 50, "y": 5, "width": 200, "height": 60, "visible": true},
    "teamHome": {"x": 5, "y": 30, "width": 200, "height": 200, "visible": true},
    "teamAway": {"x": 75, "y": 30, "width": 200, "height": 200, "visible": true},
    "fieldLogo": {"x": 45, "y": 2, "width": 80, "height": 80, "visible": true},
    "cards": {"x": 50, "y": 75, "width": 300, "height": 60, "visible": true},
    "lastGoal": {"x": 50, "y": 85, "width": 400, "height": 40, "visible": true},
    "adBanner": {"x": 0, "y": 92, "width": 100, "height": 8, "visible": true},
    "period": {"x": 50, "y": 12, "width": 150, "height": 30, "visible": true}
  }',
  1
);
