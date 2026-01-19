# 🚀 Panduan Deployment IoT Desalinasi

Tutorial lengkap untuk deploy aplikasi IoT Desalinasi ke cloud dengan:
- **Backend**: Railway atau Render
- **Database**: Railway MySQL
- **Frontend**: Vercel

---

## 📋 Daftar Isi

1. [Persiapan Awal](#-1-persiapan-awal)
2. [Deploy Database (Railway MySQL)](#-2-deploy-database-railway-mysql)
3. [Deploy Backend (Railway)](#-3-deploy-backend-railway)
4. [Deploy Backend (Render) - Alternatif](#-4-deploy-backend-render---alternatif)
5. [Deploy Frontend (Vercel)](#-5-deploy-frontend-vercel)
6. [Konfigurasi ESP32](#-6-konfigurasi-esp32)
7. [Testing & Troubleshooting](#-7-testing--troubleshooting)

---

## 🔧 1. Persiapan Awal

### A. Akun yang Diperlukan

Buat akun gratis di platform berikut:

| Platform | Link | Fungsi |
|----------|------|--------|
| GitHub | [github.com](https://github.com) | Repository kode |
| Railway | [railway.app](https://railway.app) | Backend + Database |
| Vercel | [vercel.com](https://vercel.com) | Frontend hosting |

### B. Push Proyek ke GitHub

Jika belum ada repository GitHub:

```bash
# Di folder proyek IoT Desalinasi
git init
git add .
git commit -m "Initial commit"

# Buat repository baru di GitHub, lalu:
git remote add origin https://github.com/USERNAME/iot-desalinasi.git
git branch -M main
git push -u origin main
```

### C. Struktur Repository

Pastikan struktur folder seperti ini:
```
iot-desalinasi/
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── esp32/
│   └── *.ino
└── docs/
```

---

## 🗄️ 2. Deploy Database (Railway MySQL)

### Langkah 1: Login ke Railway

1. Buka [railway.app](https://railway.app)
2. Klik **"Login"** → pilih **"Login with GitHub"**
3. Authorize Railway untuk akses GitHub

### Langkah 2: Buat Project Baru

1. Di Dashboard, klik **"+ New Project"**
2. Pilih **"Empty Project"**
3. Beri nama project: `iot-desalinasi`

### Langkah 3: Tambahkan MySQL Database

1. Di dalam project, klik **"+ New"**
2. Pilih **"Database"**
3. Pilih **"Add MySQL"**

![Railway MySQL](https://railway.app/brand/logo-dark.svg)

4. Tunggu hingga database terbuat (±30 detik)

### Langkah 4: Dapatkan Credentials Database

1. Klik service **MySQL** yang baru dibuat
2. Buka tab **"Variables"** atau **"Connect"**
3. Catat informasi berikut:

```env
MYSQL_HOST=containers-us-west-xxx.railway.app
MYSQL_PORT=6872
MYSQL_USER=root
MYSQL_PASSWORD=xxxxxxxxxxxx
MYSQL_DATABASE=railway
```

Atau gunakan **connection string**:
```
mysql://root:password@host:port/railway
```

### Langkah 5: Buat Database

Railway otomatis membuat database bernama `railway`. Jika ingin membuat database khusus:

1. Klik tab **"Data"** di MySQL service
2. Klik **"Connect"** untuk buka query interface
3. Jalankan:
```sql
CREATE DATABASE IF NOT EXISTS iot_desalinasi;
```

---

## 🖥️ 3. Deploy Backend (Railway)

### Langkah 1: Tambahkan Backend Service

1. Di project Railway yang sama, klik **"+ New"**
2. Pilih **"GitHub Repo"**
3. Pilih repository `iot-desalinasi`
4. Railway akan mendeteksi folder - pilih deploy dari **root** atau **backend** folder

### Langkah 2: Konfigurasi Build Settings

1. Klik service backend yang baru
2. Buka tab **"Settings"**
3. Atur konfigurasi:

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm run prod` |

### Langkah 3: Tambahkan Environment Variables

1. Buka tab **"Variables"**
2. Klik **"+ New Variable"** atau **"RAW Editor"**
3. Tambahkan variables berikut:

```env
# Database Connection (dari MySQL service)
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6872
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=railway

# Server Config
PORT=3000
NODE_ENV=production

# CORS - Update setelah deploy frontend
CORS_ORIGIN=https://your-frontend.vercel.app
```

**💡 TIP**: Railway bisa auto-inject MySQL variables. Klik **"+ New Variable"** → **"Add Reference"** → pilih dari MySQL service.

### Langkah 4: Deploy

1. Railway akan auto-deploy setiap push ke GitHub
2. Untuk manual deploy: Settings → **"Deploy"** → **"Deploy Now"**
3. Tunggu build selesai (2-5 menit)

### Langkah 5: Dapatkan URL Backend

1. Setelah deploy sukses, buka tab **"Settings"**
2. Di bagian **"Domains"**, klik **"Generate Domain"**
3. Anda akan mendapat URL seperti:
   ```
   https://iot-desalinasi-backend-production.up.railway.app
   ```

### Langkah 6: Test Backend

Buka browser dan akses:
```
https://YOUR-BACKEND-URL.railway.app/api/health
```

Response yang diharapkan:
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 🔄 4. Deploy Backend (Render) - Alternatif

Jika memilih Render sebagai alternatif Railway:

### Langkah 1: Login ke Render

1. Buka [render.com](https://render.com)
2. Klik **"Get Started"** → **"GitHub"**
3. Authorize Render

### Langkah 2: Buat Web Service

1. Di Dashboard, klik **"New +"** → **"Web Service"**
2. Connect repository GitHub `iot-desalinasi`
3. Konfigurasi:

| Field | Value |
|-------|-------|
| Name | `iot-desalinasi-backend` |
| Region | Singapore (terdekat) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm run prod` |
| Instance Type | Free |

### Langkah 3: Environment Variables

Di bagian **"Environment"**, tambahkan:

```env
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6872
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=railway
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Langkah 4: Deploy

1. Klik **"Create Web Service"**
2. Tunggu build (5-10 menit pertama kali)
3. URL akan seperti:
   ```
   https://iot-desalinasi-backend.onrender.com
   ```

**⚠️ CATATAN RENDER**: 
- Free tier akan sleep setelah 15 menit tidak ada traffic
- Perlu 30-60 detik untuk "wake up" setelah sleep
- Untuk IoT yang kirim data terus-menerus, ini bisa jadi masalah
- **Railway lebih disarankan** untuk use case IoT

---

## 🌐 5. Deploy Frontend (Vercel)

### Langkah 1: Login ke Vercel

1. Buka [vercel.com](https://vercel.com)
2. Klik **"Sign Up"** → **"Continue with GitHub"**
3. Authorize Vercel

### Langkah 2: Import Project

1. Di Dashboard, klik **"Add New..."** → **"Project"**
2. Pilih repository `iot-desalinasi`
3. Klik **"Import"**

### Langkah 3: Konfigurasi Project

Atur konfigurasi berikut:

| Field | Value |
|-------|-------|
| Project Name | `iot-desalinasi` |
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### Langkah 4: Environment Variables

Klik **"Environment Variables"** dan tambahkan:

```env
VITE_API_URL=https://your-backend-url.railway.app/api
```

**⚠️ PENTING**: Prefix `VITE_` wajib untuk environment variables di Vite!

### Langkah 5: Deploy

1. Klik **"Deploy"**
2. Tunggu build selesai (1-3 menit)
3. Anda akan mendapat URL seperti:
   ```
   https://iot-desalinasi.vercel.app
   ```

### Langkah 6: Update CORS di Backend

Kembali ke Railway/Render, update environment variable:
```env
CORS_ORIGIN=https://iot-desalinasi.vercel.app
```

Redeploy backend agar CORS update.

---

## 📡 6. Konfigurasi ESP32

Setelah backend online, update kode ESP32:

### Update URL di ESP32

```cpp
// ========== KONFIGURASI SERVER ==========
// Ganti dengan URL backend production Anda
const char* serverUrl = "https://iot-desalinasi-backend-production.up.railway.app";

// Endpoints
const char* humidityUrl = "https://YOUR-BACKEND/api/esp32/humidity";
const char* temperatureUrl = "https://YOUR-BACKEND/api/esp32/temperature";
const char* waterLevelUrl = "https://YOUR-BACKEND/api/esp32/waterlevel";
const char* waterWeightUrl = "https://YOUR-BACKEND/api/esp32/waterweight";
const char* valveStatusUrl = "https://YOUR-BACKEND/api/esp32/valve";
```

### Contoh Lengkap (ESP32_Water_Control.ino)

```cpp
// ========== KONFIGURASI SERVER PRODUCTION ==========
const char* waterLevelUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/waterlevel";
const char* waterWeightUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/waterweight";
const char* valveStatusUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/valve";
```

### ⚠️ HTTPS pada ESP32

Untuk koneksi HTTPS, Anda mungkin perlu:

1. **Gunakan WiFiClientSecure** (bukan WiFiClient)
2. **Update kode HTTP**:

```cpp
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

WiFiClientSecure client;

void setup() {
  // Skip certificate verification (tidak disarankan untuk production sebenarnya)
  client.setInsecure();
}

void sendData() {
  HTTPClient http;
  http.begin(client, url); // Gunakan client secure
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonData);
  http.end();
}
```

Atau gunakan **HTTP** mode jika tersedia (beberapa cloud provider mendukung).

---

## 🧪 7. Testing & Troubleshooting

### A. Test Checklist

| Test | URL/Command | Expected |
|------|-------------|----------|
| Backend Health | `GET /api/health` | `{"status":"ok"}` |
| Database Connected | `GET /api/health` | `{"database":"connected"}` |
| Frontend Loads | Buka URL Vercel | Dashboard muncul |
| ESP32 → Backend | Monitor Serial ESP32 | `✓ Data sent` |
| Realtime Data | Dashboard | Data terupdate |

### B. Common Issues & Solutions

#### 1. CORS Error di Frontend
```
Access to fetch has been blocked by CORS policy
```
**Solusi**: Update `CORS_ORIGIN` di backend dengan URL frontend yang benar.

#### 2. Database Connection Failed
```
Error: ECONNREFUSED 127.0.0.1:3306
```
**Solusi**: Pastikan environment variables database sudah benar di Railway/Render.

#### 3. ESP32 Connection Failed
```
WiFi connected but HTTP POST failed
```
**Solusi**: 
- Pastikan URL backend HTTPS valid
- Gunakan `WiFiClientSecure` dengan `setInsecure()`
- Cek firewall/network

#### 4. Frontend Blank Page
**Solusi**:
- Cek console browser (F12)
- Pastikan `VITE_API_URL` environment variable benar
- Rebuild dan redeploy

#### 5. Railway Service Crashed
```
Error: Cannot find module
```
**Solusi**: 
- Pastikan `Root Directory` = `backend`
- Cek `package.json` ada di folder tersebut

### C. Logs & Debugging

**Railway**:
- Buka service → tab **"Logs"**
- Lihat output real-time

**Render**:
- Buka service → **"Logs"** tab
- Filter by time

**Vercel**:
- Project → **"Deployments"** → klik deployment → **"Functions"** tab

---

## 📊 Arsitektur Final

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                │
│  │   ESP32     │                                                │
│  │  Devices    │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│         │ HTTPS POST (JSON)                                     │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    RAILWAY                               │   │
│  │  ┌─────────────────┐      ┌─────────────────┐          │   │
│  │  │    Backend      │      │     MySQL       │          │   │
│  │  │   (Node.js)     │◀────▶│   Database      │          │   │
│  │  │   Port 3000     │      │   Port 6872     │          │   │
│  │  └────────┬────────┘      └─────────────────┘          │   │
│  │           │                                              │   │
│  │           │ URL: xxx.up.railway.app                     │   │
│  └───────────┼──────────────────────────────────────────────┘   │
│              │                                                   │
│              │ API Calls (HTTPS)                                │
│              ▼                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     VERCEL                               │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │              Frontend (React)                    │   │   │
│  │  │           Static Files (HTML/JS/CSS)            │   │   │
│  │  │                                                  │   │   │
│  │  │  URL: iot-desalinasi.vercel.app                 │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ▲                                   │
│                              │                                   │
│                      User Browser                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💰 Estimasi Biaya

| Service | Free Tier | Paid (jika melebihi) |
|---------|-----------|---------------------|
| Railway Backend | 500 jam/bulan | $5/bulan |
| Railway MySQL | $5 credit/bulan | $5-10/bulan |
| Vercel Frontend | Unlimited | Tetap gratis |
| **Total** | **$0** | ~$10-15/bulan |

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| Railway Dashboard | [railway.app/dashboard](https://railway.app/dashboard) |
| Vercel Dashboard | [vercel.com/dashboard](https://vercel.com/dashboard) |
| Render Dashboard | [dashboard.render.com](https://dashboard.render.com) |
| Railway Docs | [docs.railway.app](https://docs.railway.app) |
| Vercel Docs | [vercel.com/docs](https://vercel.com/docs) |

---

## ✅ Deployment Checklist

- [ ] Push kode ke GitHub
- [ ] Buat project Railway
- [ ] Deploy MySQL database
- [ ] Deploy backend ke Railway
- [ ] Set environment variables backend
- [ ] Deploy frontend ke Vercel
- [ ] Set `VITE_API_URL` di Vercel
- [ ] Update `CORS_ORIGIN` di backend
- [ ] Update URL di kode ESP32
- [ ] Test semua endpoint
- [ ] Test ESP32 → Backend
- [ ] Test Frontend → Backend → Database

---

**Selamat! Aplikasi IoT Desalinasi Anda sekarang online! 🎉**

Jika ada pertanyaan, buka issue di repository GitHub.

