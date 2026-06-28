# 📘 Dokumentasi Proyek — IoT Desalinasi AC

> Sistem monitoring real-time untuk proses desalinasi air berbasis IoT.
> Dibangun menggunakan **React + Vite** (frontend), **Node.js + Express + Prisma** (backend), **MySQL** (database), **Mosquitto MQTT** (komunikasi ESP32), dan **ESP32** (mikrokontroler sensor).

---

## 1. Gambaran Umum

Aplikasi web ini memantau dan merekam data sensor dari proses desalinasi air secara real-time. Data dikirim oleh perangkat ESP32 melalui protokol MQTT ke server backend, lalu divisualisasikan pada dashboard web yang responsif (mobile-first).

### Fitur Utama

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 1 | **Monitoring Real-time** | Tampilan live data kelembapan, suhu udara, dan suhu air |
| 2 | **Data Logger Per-User** | Pencatatan data di background, berjalan terus meskipun browser ditutup |
| 3 | **Laporan Individual** | Setiap user hanya melihat & mengelola data miliknya sendiri |
| 4 | **Export CSV** | Download data sensor ke file CSV (nama file menyertakan username) |
| 5 | **Kontrol Valve (Pompa)** | Kendali valve air dengan mode AUTO / MANUAL via MQTT |
| 6 | **Water Level & Weight** | Pemantauan level air dan berat air secara real-time |
| 7 | **Multi-User & RBAC** | Sistem login dengan role Admin dan User |
| 8 | **Manajemen Sensor Dinamis** | Admin dapat mengkonfigurasi sensor yang terdeteksi dari ESP32 |
| 9 | **Daily Log Otomatis** | Sistem cron menghasilkan log CSV harian secara otomatis |
| 10 | **Skema Desalinasi** | Upload dan tampilkan diagram SVG proses desalinasi |
| 11 | **PWA (Progressive Web App)** | Aplikasi bisa di-install di perangkat mobile |
| 12 | **Responsive Design** | Tampilan optimal di mobile dan desktop |

---

## 2. Arsitektur Sistem

```
         Browser / Mobile (PWA)
              │
              ▼
┌─────────────────────────────────────────────────────┐
│                  VPS (Ubuntu)                        │
│                                                      │
│   ┌──────────────────────────────────────┐          │
│   │           Nginx (:80/443)            │          │
│   │                                      │          │
│   │   /         → frontend/dist/         │          │
│   │   /api/*    → proxy localhost:  │          │
│   └──────────────────────────────────────┘          │
│              │                                       │
│              ▼                                       │
│   ┌──────────────────────┐                          │
│   │  Backend (PM2) :---- │                          │
│   │  Node.js + Prisma    │                          │
│   └──────────┬───────────┘                          │
│              │                                       │
│       ┌──────┴──────┐                               │
│       ▼             ▼                               │
│  ┌──────────┐  ┌──────────────┐                     │
│  │  MySQL   │  │  Mosquitto   │                     │
│  └──────────┘  └──────▲───────┘                     │
│                       │                              │
└───────────────────────┼──────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │         ESP32             │
          └───────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Frontend** | React + Vite | React 18, Vite 7 |
| **Styling** | Tailwind CSS | 3.4 |
| **Charts** | Recharts | 3.5 |
| **Icons** | Lucide React | 0.294 |
| **Backend** | Node.js + Express | Express 4.18 |
| **ORM** | Prisma | 5.22 |
| **Database** | MySQL | 8.x |
| **Authentication** | JWT (Access + Refresh Token) | jsonwebtoken 9.x |
| **MQTT** | Mosquitto Broker + mqtt.js | mqtt 5.15 |
| **Process Manager** | PM2 | Latest |
| **Web Server** | Nginx | Latest |
| **Hardware** | ESP32 Dev Board | – |
| **Sensor** | DHT22 (Humidity), DS18B20 (Temperature) | – |

---

## 4. Struktur Folder

```
IoT-desalinasi-AC/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── migrations/           # Migration files
│   │   └── seed.js               # Data awal (admin account)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # Konfigurasi database legacy
│   │   │   └── prisma.js         # Prisma client instance
│   │   ├── controllers/
│   │   │   ├── AuthController.js       # Login, register, me
│   │   │   ├── DailyLogController.js   # CRUD daily logs
│   │   │   ├── ESP32Controller.js      # Receive data dari ESP32
│   │   │   ├── IntervalController.js   # CRUD interval logger
│   │   │   ├── LoggerController.js     # Start/stop/status logger per user
│   │   │   ├── SchemaController.js     # Upload/get skema SVG
│   │   │   ├── SensorConfigController.js # Konfigurasi sensor
│   │   │   ├── SensorController.js     # CRUD sensor data
│   │   │   ├── UserController.js       # CRUD user (admin)
│   │   │   └── ValveController.js      # Kontrol valve
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT authenticate & requireAdmin
│   │   ├── routes/
│   │   │   ├── index.js          # Route utama (/api/*)
│   │   │   ├── auth.js           # /api/auth/*
│   │   │   ├── users.js          # /api/users/*
│   │   │   ├── intervals.js      # /api/intervals/*
│   │   │   ├── dailyLogs.js      # /api/daily-logs/*
│   │   │   ├── schema.js         # /api/schema/*
│   │   │   ├── valve.js          # /api/valve/*
│   │   │   └── sensorConfigRoutes.js # /api/sensor-config/*
│   │   ├── services/
│   │   │   ├── BackgroundLogger.js   # Logger per-user di background
│   │   │   ├── DailyLogService.js    # Cron job log harian
│   │   │   ├── DataService.js        # CRUD data sensor (Prisma)
│   │   │   ├── MockDataStore.js      # Mock data untuk dev
│   │   │   ├── MqttService.js        # Koneksi & subscribe MQTT
│   │   │   └── SchemaService.js      # Manajemen skema SVG
│   │   ├── app.js                # Express app (cors, helmet, routes)
│   │   └── server.js             # Entry point, start server
│   ├── package.json
│   └── .env                      # Environment variables (TIDAK di-commit)
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   └── sw.js                 # Service worker
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── DailyLogManagement.jsx    # Kelola log harian
│   │   │   │   ├── LoggerMonitor.jsx         # Monitor logger semua user
│   │   │   │   ├── SchemaManagement.jsx      # Upload skema SVG
│   │   │   │   └── SensorConfigPanel.jsx     # Konfigurasi sensor
│   │   │   ├── shared/
│   │   │   │   ├── BottomSheetModal.jsx      # Modal reusable (bottom sheet mobile)
│   │   │   │   ├── CustomAlert.jsx           # Alert kustom
│   │   │   │   ├── ProtectedRoute.jsx        # Route guard (auth)
│   │   │   │   ├── SchemaViewer.jsx          # Penampil skema SVG
│   │   │   │   ├── Sidebar.jsx               # Navigasi sidebar
│   │   │   │   └── UserProfileModal.jsx      # Modal profil user
│   │   │   └── user/
│   │   │       ├── CardsCarousel.jsx         # Carousel kartu sensor
│   │   │       ├── DataLogger.jsx            # Kontrol data logger
│   │   │       ├── SensorChart.jsx           # Grafik sensor
│   │   │       ├── SensorSelectCard.jsx      # Kartu pemilih sensor
│   │   │       ├── ValveControl.jsx          # Kontrol valve
│   │   │       ├── WaterLevelCard.jsx        # Kartu level air
│   │   │       └── WaterWeightCard.jsx       # Kartu berat air
│   │   ├── context/
│   │   │   ├── AuthContext.jsx               # Autentikasi state
│   │   │   └── LoggerContext.jsx             # Logger state global
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx        # Dashboard admin
│   │   │   │   ├── AdminLayout.jsx           # Layout admin
│   │   │   │   ├── IntervalSettings.jsx      # Pengaturan interval
│   │   │   │   ├── SensorConfig.jsx          # Halaman konfigurasi sensor
│   │   │   │   └── UserManagement.jsx        # Manajemen user
│   │   │   ├── public/
│   │   │   │   └── Login.jsx                 # Halaman login
│   │   │   └── user/
│   │   │       ├── Dashboard.jsx             # Dashboard user
│   │   │       └── Report.jsx                # Halaman laporan
│   │   ├── services/
│   │   │   └── (8 service files)             # API service layer
│   │   ├── App.jsx                           # Root component + routing
│   │   └── main.jsx                          # Entry point React
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md
```

---

## 5. Database Schema (Prisma)

### Model Overview

| Model | Tabel | Deskripsi |
|-------|-------|-----------|
| `User` | `users` | Akun pengguna (Admin/User) |
| `SensorData` | `sensor_data` | Data sensor yang direkam oleh logger |
| `SensorConfig` | `sensor_configs` | Konfigurasi sensor (nama, tipe, threshold) |
| `SensorCategory` | `sensor_categories` | Kategori sensor (humidity, air_temp, water_temp) |
| `LoggerInterval` | `logger_intervals` | Pilihan interval pencatatan (diatur admin) |
| `DailyLog` | `daily_logs` | Log CSV harian otomatis |
| `DesalinationSchema` | `desalination_schemas` | Diagram SVG proses desalinasi |
| `ValveConfig` | `valve_config` | Konfigurasi threshold valve |

### Relasi Utama

```
User ──┬──→ SensorData (userId)         # Data milik user
       ├──→ DailyLog (userId)           # Log harian milik user
       ├──→ SensorConfig (configuredById) # Sensor yang dikonfigurasi
       ├──→ ValveConfig (updatedById)     # Valve yang diupdate
       ├──→ DesalinationSchema (uploadedBy)
       └──→ LoggerInterval (activeIntervalId) # Interval aktif user
```

### Tipe Sensor

| Tipe | Sensor ID | Jumlah | Unit |
|------|-----------|--------|------|
| `humidity` | RH1–RH7 | 7 | % |
| `air_temperature` | T1–T7 | 7 | °C |
| `water_temperature` | T8–T15 | 8 | °C |
| `water_level` | WL1 | 1 | % (real-time only) |
| `water_weight` | WW1 | 1 | kg (real-time only) |

---

## 6. API Endpoints

> Semua endpoint (kecuali `/api/auth/login`) memerlukan header `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| POST | `/api/auth/login` | Login (username/email + password) | Public |
| POST | `/api/auth/register` | Register user baru | Admin |
| GET | `/api/auth/me` | Data user saat ini | Auth |
| POST | `/api/auth/refresh` | Refresh access token | Auth |

### Sensor Data

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api/sensors` | Ambil data sensor (filtered per user) | Auth |
| GET | `/api/sensors?sensorType=humidity` | Filter berdasarkan tipe | Auth |
| GET | `/api/sensors?sensorId=RH1` | Filter berdasarkan ID sensor | Auth |
| GET | `/api/sensors/realtime` | Data real-time dari cache ESP32 | Auth |
| POST | `/api/sensors` | Simpan data sensor baru | Auth |
| DELETE | `/api/sensors/filtered` | Hapus data sesuai filter (per user) | Auth |
| DELETE | `/api/sensors/:id` | Hapus satu record | Auth |
| DELETE | `/api/sensors` | Hapus semua data user | Auth |

### Data Logger

| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api/logger/status` | Status logger user saat ini | Auth |
| POST | `/api/logger/start` | Start logger untuk user | Auth |
| POST | `/api/logger/stop` | Stop logger user | Auth |
| POST | `/api/logger/config` | Konfigurasi logger | Auth |
| GET | `/api/logger/all` | Status semua logger | Admin |
| POST | `/api/logger/stop-all` | Stop semua logger | Admin |
| POST | `/api/logger/stop/:userId` | Stop logger user tertentu | Admin |

### ESP32

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/esp32/sensors` | Terima data sensor generik |
| POST | `/api/esp32/temperature` | Terima data suhu |
| POST | `/api/esp32/humidity` | Terima data kelembapan |
| POST | `/api/esp32/waterlevel` | Terima data level air |
| POST | `/api/esp32/waterweight` | Terima data berat air |
| POST | `/api/esp32/valve` | Terima status valve |
| GET | `/api/esp32/realtime` | Cache data real-time |

### User Management (Admin)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/users` | Daftar semua user |
| POST | `/api/users` | Buat user baru |
| PUT | `/api/users/:id` | Edit user |
| DELETE | `/api/users/:id` | Hapus user |

### Lainnya

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/intervals/*` | CRUD interval pencatatan |
| GET/POST/DELETE | `/api/daily-logs/*` | Kelola log harian |
| GET/POST | `/api/schema/*` | Upload/tampilkan skema SVG |
| GET/POST | `/api/valve/*` | Konfigurasi valve |
| GET/POST | `/api/sensor-config/*` | Konfigurasi sensor |

---

## 7. MQTT Topics

### ESP32 → Backend (Publish)

| Topic | Payload | Deskripsi |
|-------|---------|-----------|
| `esp32/sensors` | `{"S1":25.5, "S2":70.0, ...}` | Data sensor generik |
| `esp32/temperature` | `{"T1":25.5, "T2":26.0, ...}` | Data suhu |
| `esp32/humidity` | `{"RH1":65.0, "RH2":70.0, ...}` | Data kelembapan |
| `esp32/waterlevel` | `{"WL1":75}` | Level air |
| `esp32/waterweight` | `{"WW1":2.5}` | Berat air |
| `esp32/valve` | `{"status":"open","mode":"auto"}` | Status valve |

### Backend → ESP32 (Subscribe)

| Topic | Payload | Deskripsi |
|-------|---------|-----------|
| `iot/desalinasi/valve/control` | `{"command":"open"}` | Perintah buka/tutup valve |
| `iot/desalinasi/valve/config` | `{"onThreshold":..., "offThreshold":...}` | Konfigurasi threshold |

---

## 8. Environment Variables (.env)

```env
# Database
DATABASE_URL="mysql://user:password@localhost:----/iot_desalinasi"

# Server
PORT=----
NODE_ENV=production

# JWT
JWT_SECRET=<random-64-byte-hex>
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=<random-64-byte-hex-different>
JWT_REFRESH_EXPIRES_IN=7d

# Default Admin
DEFAULT_ADMIN_USERNAME=----
DEFAULT_ADMIN_EMAIL=----
DEFAULT_ADMIN_PASSWORD=----

# MQTT
MQTT_BROKER=mqtt://localhost:----
MQTT_USERNAME=----
MQTT_PASSWORD=----
```

---

## 9. Menjalankan Lokal (Development)

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js    # Buat akun admin default
npm run dev            # Jalankan dengan nodemon (hot-reload)
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Buka di http://localhost:5173
```

---

## 10. Build Production

```bash
# Frontend
cd frontend
npm run build          # Output di dist/

# Backend
cd backend
npm run prod           # NODE_ENV=production
```

---

*Dokumentasi ini terakhir diperbarui: 21 Februari 2026*
