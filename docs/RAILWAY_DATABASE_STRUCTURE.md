# 🗄️ Struktur Database MySQL untuk Railway

Dokumentasi lengkap struktur database IoT Desalinasi untuk deployment di Railway MySQL.

---

## 📋 Daftar Isi

1. [Informasi Database](#-informasi-database)
2. [Struktur Tabel](#-struktur-tabel)
3. [Setup Database di Railway](#-setup-database-di-railway)
4. [SQL Script](#-sql-script)
5. [Query Berguna](#-query-berguna)
6. [Maintenance](#-maintenance)

---

## 📌 Informasi Database

| Property | Value |
|----------|-------|
| **Database Engine** | MySQL 8.0+ |
| **Character Set** | utf8mb4 |
| **Collation** | utf8mb4_general_ci |
| **Database Name** | `railway` (default Railway) atau `iot_desalinasi` |

### Catatan Railway

Railway MySQL secara default membuat database bernama `railway`. Anda bisa langsung menggunakan database ini tanpa membuat database baru.

---

## 📊 Struktur Tabel

### Tabel: `sensor_data`

Tabel utama untuk menyimpan data pembacaan sensor.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | INT(11) | NO | AUTO_INCREMENT | Primary Key |
| `sensor_id` | VARCHAR(10) | NO | - | ID Sensor (RH1-RH7, T1-T15) |
| `sensor_type` | ENUM | NO | - | Tipe: 'humidity', 'temperature' |
| `value` | FLOAT | NO | - | Nilai pembacaan sensor |
| `unit` | VARCHAR(10) | NO | '%' | Satuan (%, °C) |
| `status` | ENUM | NO | 'active' | Status: 'active', 'inactive' |
| `interval` | INT(11) | YES | NULL | Interval logging (5, 30, 60, 1800 detik) |
| `timestamp` | DATETIME | NO | CURRENT_TIMESTAMP | Waktu pencatatan |

### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `PRIMARY` | `id` | PRIMARY | Unique identifier |
| `idx_sensor_id` | `sensor_id` | INDEX | Fast lookup by sensor |
| `idx_sensor_type` | `sensor_type` | INDEX | Filter by type |
| `idx_timestamp` | `timestamp` | INDEX | Time-based queries |
| `idx_interval` | `interval` | INDEX | Filter by interval |

### Sensor ID Convention

| Sensor Type | ID Range | Description |
|-------------|----------|-------------|
| **Humidity** | RH1 - RH7 | Sensor kelembapan udara |
| **Air Temperature** | T1 - T7 | Sensor suhu udara |
| **Water Temperature** | T8 - T15 | Sensor suhu air |
| **Water Level** | WL1 | ⚠️ Realtime only, tidak disimpan ke DB |
| **Water Weight** | WW1 | ⚠️ Realtime only, tidak disimpan ke DB |

---

## 🚀 Setup Database di Railway

### Langkah 1: Akses Railway MySQL

1. Login ke [Railway Dashboard](https://railway.app/dashboard)
2. Buka project IoT Desalinasi
3. Klik service **MySQL**
4. Buka tab **"Data"** atau **"Query"**

### Langkah 2: Jalankan SQL Script

Copy dan paste SQL script di bawah ke Railway Query interface.

**⚠️ PENTING untuk Railway:**

Railway otomatis membuat database `railway`, jadi **SKIP** perintah:
```sql
-- JANGAN jalankan ini di Railway:
CREATE DATABASE iot_desalinasi;
USE iot_desalinasi;
```

**Langsung jalankan** CREATE TABLE saja.

### Langkah 3: Verifikasi

Setelah menjalankan script, periksa dengan:
```sql
SHOW TABLES;
DESCRIBE sensor_data;
```

---

## 📜 SQL Script

### Script untuk Railway (Tanpa CREATE DATABASE)

```sql
-- ================================================
-- SQL Script untuk Railway MySQL
-- IoT Desalinasi Database Setup
-- ================================================
-- Railway sudah membuat database 'railway' secara otomatis
-- Langsung jalankan script ini tanpa CREATE DATABASE
-- ================================================

-- 1. Buat Tabel sensor_data
CREATE TABLE IF NOT EXISTS `sensor_data` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `sensor_id` VARCHAR(10) NOT NULL COMMENT 'Sensor ID (RH1-RH7, T1-T15)',
  `sensor_type` ENUM('humidity','temperature') NOT NULL COMMENT 'Type: humidity, temperature',
  `value` FLOAT NOT NULL COMMENT 'Sensor reading value',
  `unit` VARCHAR(10) NOT NULL DEFAULT '%' COMMENT 'Unit: %, °C',
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Sensor status',
  `interval` INT(11) DEFAULT NULL COMMENT 'Logging interval in seconds (5, 30, 60, 1800)',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Time of reading',
  PRIMARY KEY (`id`),
  KEY `idx_sensor_id` (`sensor_id`),
  KEY `idx_sensor_type` (`sensor_type`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_interval` (`interval`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
  COMMENT='IoT Desalinasi Sensor Data Table';

-- 2. Verifikasi tabel berhasil dibuat
SHOW TABLES;
DESCRIBE sensor_data;

-- 3. (Opsional) Insert data dummy untuk testing
-- Uncomment jika ingin mengisi data awal

/*
INSERT INTO `sensor_data` 
  (`sensor_id`, `sensor_type`, `value`, `unit`, `status`, `interval`, `timestamp`) 
VALUES
  ('RH1', 'humidity', 65.2, '%', 'active', 60, NOW()),
  ('RH2', 'humidity', 63.8, '%', 'active', 60, NOW()),
  ('T1', 'temperature', 27.5, '°C', 'active', 60, NOW()),
  ('T8', 'temperature', 45.5, '°C', 'active', 60, NOW());
*/

-- Selesai! Tabel siap digunakan.
```

### Script Lengkap (Untuk MySQL Lokal/XAMPP)

```sql
-- ================================================
-- SQL Script untuk Setup Database Lokal
-- IoT Desalinasi
-- ================================================

-- 1. Buat Database
CREATE DATABASE IF NOT EXISTS iot_desalinasi
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci;

-- 2. Gunakan Database
USE iot_desalinasi;

-- 3. Buat Tabel sensor_data
CREATE TABLE IF NOT EXISTS `sensor_data` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `sensor_id` VARCHAR(10) NOT NULL COMMENT 'Sensor ID (RH1-RH7, T1-T15)',
  `sensor_type` ENUM('humidity','temperature') NOT NULL COMMENT 'Type: humidity, temperature',
  `value` FLOAT NOT NULL COMMENT 'Sensor reading value',
  `unit` VARCHAR(10) NOT NULL DEFAULT '%' COMMENT 'Unit: %, °C',
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Sensor status',
  `interval` INT(11) DEFAULT NULL COMMENT 'Logging interval in seconds (5, 30, 60, 1800)',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Time of reading',
  PRIMARY KEY (`id`),
  KEY `idx_sensor_id` (`sensor_id`),
  KEY `idx_sensor_type` (`sensor_type`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_interval` (`interval`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Verifikasi
SHOW TABLES;
SELECT COUNT(*) as total_records FROM sensor_data;
```

---

## 🔍 Query Berguna

### Melihat Data Terbaru

```sql
-- 20 data terbaru
SELECT * FROM sensor_data 
ORDER BY timestamp DESC 
LIMIT 20;
```

### Statistik Per Sensor Type

```sql
SELECT 
  sensor_type,
  COUNT(*) as total_records,
  ROUND(AVG(value), 2) as avg_value,
  ROUND(MIN(value), 2) as min_value,
  ROUND(MAX(value), 2) as max_value
FROM sensor_data 
GROUP BY sensor_type;
```

### Statistik Per Sensor ID

```sql
SELECT 
  sensor_id,
  sensor_type,
  COUNT(*) as total_records,
  ROUND(AVG(value), 2) as avg_value
FROM sensor_data 
GROUP BY sensor_id, sensor_type
ORDER BY sensor_type, sensor_id;
```

### Data Per Interval

```sql
SELECT 
  `interval` as interval_seconds,
  COUNT(*) as total_records
FROM sensor_data 
WHERE `interval` IS NOT NULL
GROUP BY `interval`
ORDER BY `interval`;
```

### Data Hari Ini

```sql
SELECT * FROM sensor_data 
WHERE DATE(timestamp) = CURDATE()
ORDER BY timestamp DESC;
```

### Data 24 Jam Terakhir

```sql
SELECT * FROM sensor_data 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;
```

### Data Sensor Tertentu

```sql
-- Data sensor RH1
SELECT * FROM sensor_data 
WHERE sensor_id = 'RH1'
ORDER BY timestamp DESC
LIMIT 100;

-- Data semua humidity
SELECT * FROM sensor_data 
WHERE sensor_type = 'humidity'
ORDER BY timestamp DESC
LIMIT 100;

-- Data suhu air (T8-T15)
SELECT * FROM sensor_data 
WHERE sensor_id LIKE 'T%' 
  AND CAST(SUBSTRING(sensor_id, 2) AS UNSIGNED) >= 8
ORDER BY timestamp DESC;
```

---

## 🛠️ Maintenance

### Hapus Data Lama

```sql
-- Hapus data lebih dari 7 hari
DELETE FROM sensor_data 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- Hapus data lebih dari 30 hari
DELETE FROM sensor_data 
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Hapus Data Per Kategori

```sql
-- Hapus semua data humidity
DELETE FROM sensor_data WHERE sensor_type = 'humidity';

-- Hapus data sensor tertentu
DELETE FROM sensor_data WHERE sensor_id = 'RH1';

-- Hapus data interval tertentu
DELETE FROM sensor_data WHERE `interval` = 5;
```

### Reset Tabel

```sql
-- Hapus SEMUA data (HATI-HATI!)
TRUNCATE TABLE sensor_data;

-- Atau hapus lalu reset auto increment
DELETE FROM sensor_data;
ALTER TABLE sensor_data AUTO_INCREMENT = 1;
```

### Cek Ukuran Database

```sql
SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
  table_rows AS 'Rows'
FROM information_schema.tables 
WHERE table_schema = 'railway'  -- atau 'iot_desalinasi' untuk lokal
ORDER BY (data_length + index_length) DESC;
```

### Optimasi Tabel

```sql
-- Optimasi setelah banyak DELETE
OPTIMIZE TABLE sensor_data;

-- Analisis untuk update statistik
ANALYZE TABLE sensor_data;
```

---

## 📊 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      sensor_data                            │
├─────────────────────────────────────────────────────────────┤
│ PK │ id          │ INT(11)      │ AUTO_INCREMENT           │
├────┼─────────────┼──────────────┼──────────────────────────┤
│    │ sensor_id   │ VARCHAR(10)  │ NOT NULL                 │
│    │ sensor_type │ ENUM         │ 'humidity','temperature' │
│    │ value       │ FLOAT        │ NOT NULL                 │
│    │ unit        │ VARCHAR(10)  │ DEFAULT '%'              │
│    │ status      │ ENUM         │ 'active','inactive'      │
│    │ interval    │ INT(11)      │ NULLABLE                 │
│    │ timestamp   │ DATETIME     │ DEFAULT NOW()            │
├────┴─────────────┴──────────────┴──────────────────────────┤
│ INDEXES:                                                    │
│  • PRIMARY (id)                                             │
│  • idx_sensor_id (sensor_id)                                │
│  • idx_sensor_type (sensor_type)                            │
│  • idx_timestamp (timestamp)                                │
│  • idx_interval (interval)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Koneksi dari Backend

### Environment Variables (Railway)

```env
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6872
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=railway
```

### Sequelize Model

Backend menggunakan Sequelize ORM dengan model `SensorData`:

```javascript
const SensorData = sequelize.define('SensorData', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sensor_id: { type: DataTypes.STRING(10), allowNull: false },
    sensor_type: { type: DataTypes.ENUM('humidity', 'temperature'), allowNull: false },
    value: { type: DataTypes.FLOAT, allowNull: false },
    unit: { type: DataTypes.STRING(10), defaultValue: '%' },
    status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
    interval: { type: DataTypes.INTEGER, allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    tableName: 'sensor_data',
    timestamps: false
});
```

---

## ⚠️ Catatan Penting

1. **Railway Database Name**: Railway menggunakan `railway` sebagai database default, bukan `iot_desalinasi`.

2. **Auto Sync**: Sequelize dengan `sync({ alter: true })` akan otomatis menyesuaikan tabel dengan model. Anda bisa skip manual SQL jika backend sudah dikonfigurasi dengan benar.

3. **Water Level & Weight**: Data `WL1` (Water Level) dan `WW1` (Water Weight) TIDAK disimpan ke database. Hanya tersedia sebagai realtime data dari ESP32.

4. **Interval 30 Menit**: Interval logging `1800` detik (30 menit) sudah didukung.

5. **Backup Regular**: Lakukan backup database secara berkala, terutama sebelum operasi DELETE atau TRUNCATE.

---

## ✅ Checklist Setup Database

- [ ] Akses Railway MySQL Dashboard
- [ ] Jalankan CREATE TABLE script
- [ ] Verifikasi dengan `SHOW TABLES`
- [ ] Verifikasi struktur dengan `DESCRIBE sensor_data`
- [ ] Test insert data manual (opsional)
- [ ] Konfigurasi environment variables di backend
- [ ] Test koneksi dari backend

---

**Database siap digunakan! 🎉**
