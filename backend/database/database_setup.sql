-- ================================================
-- SQL Script untuk Setup Database IoT Desalinasi
-- ================================================
-- Jalankan script ini di phpMyAdmin atau MySQL CLI
-- untuk membuat database dan tabel secara otomatis
-- ================================================
-- UPDATED: Support individual sensors (RH1-RH7, T1-T15)
-- NOTE: WL1 (Water Level) is realtime only, not saved to database
-- ================================================

-- 1. Buat Database
CREATE DATABASE IF NOT EXISTS iot_desalinasi
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

-- 2. Gunakan Database
USE iot_desalinasi;

-- 3. Drop tabel lama jika ada (HATI-HATI: Ini akan menghapus semua data!)
-- DROP TABLE IF EXISTS sensor_data;

-- 4. Buat Tabel sensor_data (STRUKTUR BARU)
CREATE TABLE IF NOT EXISTS `sensor_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sensor_id` varchar(10) NOT NULL COMMENT 'Sensor ID (RH1-RH7, T1-T15)',
  `sensor_type` enum('humidity','temperature') NOT NULL COMMENT 'Tipe Sensor (humidity, temperature)',
  `value` float NOT NULL COMMENT 'Nilai Pembacaan Sensor',
  `unit` varchar(10) NOT NULL DEFAULT '%' COMMENT 'Satuan (%, °C)',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Status Sensor',
  `interval` int(11) DEFAULT NULL COMMENT 'Interval Logging (detik: 5, 30, 60)',
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu Pencatatan',
  PRIMARY KEY (`id`),
  KEY `idx_sensor_id` (`sensor_id`),
  KEY `idx_sensor_type` (`sensor_type`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_interval` (`interval`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tabel Data Sensor IoT Desalinasi v2.0';

-- 5. Insert Data Dummy untuk Testing (Opsional)

-- ========================================
-- HUMIDITY SENSORS (RH1-RH7)
-- ========================================
INSERT INTO `sensor_data` 
  (`sensor_id`, `sensor_type`, `value`, `unit`, `status`, `interval`, `timestamp`) 
VALUES
  ('RH1', 'humidity', 65.2, '%', 'active', 5, NOW() - INTERVAL 30 MINUTE),
  ('RH1', 'humidity', 65.5, '%', 'active', 5, NOW() - INTERVAL 25 MINUTE),
  ('RH2', 'humidity', 63.8, '%', 'active', 5, NOW() - INTERVAL 30 MINUTE),
  ('RH2', 'humidity', 64.2, '%', 'active', 5, NOW() - INTERVAL 25 MINUTE),
  ('RH3', 'humidity', 66.5, '%', 'active', 5, NOW() - INTERVAL 30 MINUTE),
  ('RH4', 'humidity', 64.1, '%', 'active', 30, NOW() - INTERVAL 20 MINUTE),
  ('RH5', 'humidity', 65.9, '%', 'active', 30, NOW() - INTERVAL 20 MINUTE),
  ('RH6', 'humidity', 62.7, '%', 'active', 60, NOW() - INTERVAL 15 MINUTE),
  ('RH7', 'humidity', 67.3, '%', 'active', 60, NOW() - INTERVAL 15 MINUTE);

-- ========================================
-- TEMPERATURE SENSORS (T1-T15)
-- ========================================
INSERT INTO `sensor_data` 
  (`sensor_id`, `sensor_type`, `value`, `unit`, `status`, `interval`, `timestamp`) 
VALUES
  ('T1', 'temperature', 27.5, '°C', 'active', 5, NOW() - INTERVAL 30 MINUTE),
  ('T1', 'temperature', 27.8, '°C', 'active', 5, NOW() - INTERVAL 25 MINUTE),
  ('T2', 'temperature', 28.1, '°C', 'active', 5, NOW() - INTERVAL 30 MINUTE),
  ('T3', 'temperature', 26.9, '°C', 'active', 5, NOW() - INTERVAL 30 MINUTE),
  ('T4', 'temperature', 27.8, '°C', 'active', 5, NOW() - INTERVAL 30 MINUTE),
  ('T5', 'temperature', 27.2, '°C', 'active', 30, NOW() - INTERVAL 20 MINUTE),
  ('T6', 'temperature', 28.3, '°C', 'active', 30, NOW() - INTERVAL 20 MINUTE),
  ('T7', 'temperature', 29.1, '°C', 'active', 30, NOW() - INTERVAL 20 MINUTE),
  ('T8', 'temperature', 26.5, '°C', 'active', 60, NOW() - INTERVAL 15 MINUTE),
  ('T9', 'temperature', 30.2, '°C', 'active', 60, NOW() - INTERVAL 15 MINUTE),
  ('T10', 'temperature', 31.0, '°C', 'active', 5, NOW() - INTERVAL 10 MINUTE),
  ('T11', 'temperature', 45.5, '°C', 'active', 5, NOW() - INTERVAL 10 MINUTE),
  ('T12', 'temperature', 50.2, '°C', 'active', 5, NOW() - INTERVAL 10 MINUTE),
  ('T13', 'temperature', 55.8, '°C', 'active', 30, NOW() - INTERVAL 5 MINUTE),
  ('T14', 'temperature', 60.1, '°C', 'active', 30, NOW() - INTERVAL 5 MINUTE),
  ('T15', 'temperature', 65.3, '°C', 'active', 60, NOW() - INTERVAL 5 MINUTE);

-- ========================================
-- NOTE: WATER LEVEL SENSOR (WL1)
-- Water level is REALTIME ONLY - not saved to database
-- Data is only available in ESP32 cache for live display
-- ========================================


-- 6. Verifikasi Data
SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 20;

-- 7. Lihat Struktur Tabel
DESCRIBE sensor_data;

-- 8. Hitung Total Data
SELECT COUNT(*) as total_records FROM sensor_data;

-- 9. Data Per Sensor Type
SELECT 
  sensor_type,
  COUNT(*) as total_records,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM sensor_data 
GROUP BY sensor_type;

-- 10. Data Per Sensor ID
SELECT 
  sensor_id,
  sensor_type,
  COUNT(*) as total_records,
  AVG(value) as avg_value
FROM sensor_data 
GROUP BY sensor_id, sensor_type
ORDER BY sensor_type, sensor_id;

-- ================================================
-- Query Berguna untuk Maintenance
-- ================================================

-- Hapus data lebih dari 30 hari
-- DELETE FROM sensor_data WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Hapus semua data humidity
-- DELETE FROM sensor_data WHERE sensor_type = 'humidity';

-- Hapus data sensor tertentu
-- DELETE FROM sensor_data WHERE sensor_id = 'RH1';

-- Hapus semua data (HATI-HATI!)
-- TRUNCATE TABLE sensor_data;

-- Reset Auto Increment
-- ALTER TABLE sensor_data AUTO_INCREMENT = 1;

-- ================================================
-- Selesai! Database siap digunakan.
-- ================================================
