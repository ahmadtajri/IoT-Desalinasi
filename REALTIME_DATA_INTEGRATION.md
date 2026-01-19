# Integrasi Data Realtime: Backend ↔ Frontend

## 📋 Ringkasan Masalah

**Pertanyaan:** Mengapa pada saat backend dihentikan, frontend masih menampilkan semua data?

**Jawaban:** Frontend sebelumnya menggunakan **data simulasi** yang di-generate langsung di browser menggunakan `Math.random()`, bukan data dari backend atau ESP32.

## 🔍 Analisis Masalah

### Sebelum Perubahan

File: `frontend/src/context/LoggerContext.jsx`

```javascript
// MASALAH: Data di-generate di frontend (baris 84-180)
useEffect(() => {
    const generateData = () => {
        // Generate random data untuk H1-H7
        humidity[key] = parseFloat((50 + Math.random() * 40).toFixed(1));
        
        // Generate random data untuk T1-T15
        airTemperature[key] = parseFloat((25 + Math.random() * 10).toFixed(1));
        
        // ... dst
    };
    
    const intervalId = setInterval(generateData, 1000);
    return () => clearInterval(intervalId);
}, []);
```

**Akibatnya:**
- ✅ Data tetap muncul meskipun backend mati
- ❌ Data yang ditampilkan adalah data palsu/simulasi
- ❌ Tidak ada koneksi dengan database atau ESP32
- ❌ User tidak tahu apakah backend sedang online/offline

---

## ✅ Solusi yang Diimplementasikan

### 1. Backend: Endpoint Realtime Data Baru

**File:** `backend/src/controllers/SensorController.js`

Ditambahkan method baru `getRealtimeData()`:

```javascript
async getRealtimeData(req, res) {
    try {
        // Ambil 100 data terakhir dari database
        const allData = await DataService.getAllData(100);
        
        // Organize data berdasarkan sensor type
        const realtimeData = {
            humidity: {},
            airTemperature: {},
            waterTemperature: {},
            waterLevel: {}
        };
        
        const sensorStatus = {
            humidity: {},
            airTemperature: {},
            waterTemperature: {},
            waterLevel: {}
        };
        
        // Ambil reading terbaru untuk setiap sensor
        const latestReadings = {};
        allData.forEach(record => {
            const sensorId = record.sensor_id;
            if (!latestReadings[sensorId] || 
                new Date(record.timestamp) > new Date(latestReadings[sensorId].timestamp)) {
                latestReadings[sensorId] = record;
            }
        });
        
        // Organize ke dalam response structure
        Object.values(latestReadings).forEach(record => {
            const sensorId = record.sensor_id;
            const value = record.value;
            const isActive = record.status === 'active';
            
            if (record.sensor_type === 'humidity') {
                realtimeData.humidity[sensorId] = value;
                sensorStatus.humidity[sensorId] = isActive;
            } else if (record.sensor_type === 'temperature') {
                const sensorNum = parseInt(sensorId.substring(1));
                if (sensorNum <= 7) {
                    realtimeData.airTemperature[sensorId] = value;
                    sensorStatus.airTemperature[sensorId] = isActive;
                } else {
                    realtimeData.waterTemperature[sensorId] = value;
                    sensorStatus.waterTemperature[sensorId] = isActive;
                }
            } else if (record.sensor_type === 'waterLevel') {
                realtimeData.waterLevel[sensorId] = value;
                sensorStatus.waterLevel[sensorId] = isActive;
            }
        });
        
        res.json({
            realtimeData,
            sensorStatus,
            pumpStatus: false, // TODO: Get from ESP32
            waterWeight: 0,    // TODO: Get from ESP32
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getRealtimeData:', error);
        res.status(500).json({ error: error.message });
    }
}
```

**File:** `backend/src/routes/index.js`

Ditambahkan route baru:

```javascript
router.get('/sensors/realtime', SensorController.getRealtimeData);
```

**Endpoint:** `GET http://localhost:3000/api/sensors/realtime`

**Response Format:**
```json
{
  "realtimeData": {
    "humidity": {
      "H1": 65.5,
      "H2": 72.3,
      "H3": 58.9
    },
    "airTemperature": {
      "T1": 28.5,
      "T2": 29.1
    },
    "waterTemperature": {
      "T8": 45.2,
      "T9": 46.8
    },
    "waterLevel": {
      "WL1": 75.5
    }
  },
  "sensorStatus": {
    "humidity": {
      "H1": true,
      "H2": true,
      "H3": false
    },
    "airTemperature": {
      "T1": true,
      "T2": true
    },
    "waterTemperature": {
      "T8": true,
      "T9": true
    },
    "waterLevel": {
      "WL1": true
    }
  },
  "pumpStatus": false,
  "waterWeight": 0,
  "timestamp": "2026-01-07T10:18:49.321Z"
}
```

---

### 2. Frontend: Service Layer

**File:** `frontend/src/services/sensorService.js`

Ditambahkan method baru:

```javascript
async getRealtimeData() {
    const response = await api.get('/sensors/realtime');
    return response.data;
}
```

---

### 3. Frontend: Context Update

**File:** `frontend/src/context/LoggerContext.jsx`

**SEBELUM:**
```javascript
// Generate data simulasi setiap 1 detik
useEffect(() => {
    const generateData = () => {
        // Math.random() untuk semua sensor
    };
    const intervalId = setInterval(generateData, 1000);
    return () => clearInterval(intervalId);
}, []);
```

**SESUDAH:**
```javascript
// Fetch data real dari backend setiap 1 detik
useEffect(() => {
    const fetchRealtimeData = async () => {
        try {
            const data = await sensorService.getRealtimeData();
            
            // Update state dengan data dari backend
            setRealtimeData(data.realtimeData);
            setSensorStatus(data.sensorStatus);
            setPumpStatus(data.pumpStatus);
            setWaterWeight(data.waterWeight);
            
            // Update timestamps
            const now = Date.now();
            Object.keys(data.realtimeData.humidity).forEach(key => {
                if (data.realtimeData.humidity[key] !== null) {
                    lastUpdateRef.current.humidity[key] = now;
                }
            });
            // ... dst untuk sensor lain
        } catch (error) {
            console.error("Failed to fetch realtime data:", error);
            // Ketika backend mati, set semua sensor ke inactive/null
            setRealtimeData({
                humidity: {},
                airTemperature: {},
                waterTemperature: {},
                waterLevel: {}
            });
            setSensorStatus({
                humidity: {},
                airTemperature: {},
                waterTemperature: {},
                waterLevel: {}
            });
        }
    };
    
    fetchRealtimeData(); // Initial fetch
    const intervalId = setInterval(fetchRealtimeData, 1000);
    return () => clearInterval(intervalId);
}, []);
```

---

## 🎯 Hasil Perubahan

### Sekarang (Setelah Perubahan)

| Kondisi | Perilaku Frontend |
|---------|-------------------|
| **Backend Running** | ✅ Menampilkan data REAL dari database |
| **Backend Stopped** | ❌ Semua sensor menunjukkan status INACTIVE/NULL |
| **Database Kosong** | ⚠️ Tidak ada data ditampilkan (semua kosong) |
| **Logger Running** | ✅ Data terus bertambah setiap interval |

### Error Handling

Ketika backend mati, frontend akan:
1. Menampilkan error di console: `"Failed to fetch realtime data"`
2. Set semua `realtimeData` menjadi objek kosong `{}`
3. Set semua `sensorStatus` menjadi objek kosong `{}`
4. Dashboard akan menampilkan "No Data" atau sensor inactive

---

## 🧪 Cara Testing

### 1. Test dengan Backend Running

```bash
# Terminal 1: Start Backend
cd backend
npm start

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

**Expected:**
- Dashboard menampilkan data kosong (karena database masih kosong)
- Console tidak ada error

### 2. Start Logger untuk Generate Data

```bash
# Gunakan Postman atau curl
POST http://localhost:3000/api/logger/start
Content-Type: application/json

{
  "humidity": "all",
  "temperature": "all"
}
```

**Expected:**
- Backend console: `[BackgroundLogger] Started with interval 5000ms`
- Setiap 5 detik: `[BackgroundLogger] Cycle #X completed. Y records saved.`
- Dashboard mulai menampilkan data sensor

### 3. Test Realtime Endpoint Langsung

```bash
# Browser atau curl
GET http://localhost:3000/api/sensors/realtime
```

**Expected Response:**
```json
{
  "realtimeData": {
    "humidity": {
      "H1": 65.5,
      "H2": 72.3,
      ...
    },
    "airTemperature": { ... },
    "waterTemperature": { ... },
    "waterLevel": { ... }
  },
  "sensorStatus": { ... },
  "pumpStatus": false,
  "waterWeight": 0,
  "timestamp": "2026-01-07T10:18:49.321Z"
}
```

### 4. Test Backend Stopped

```bash
# Stop backend (Ctrl+C di terminal backend)
```

**Expected:**
- Frontend console: `"Failed to fetch realtime data: Network Error"`
- Dashboard: Semua sensor menunjukkan status inactive/no data
- Tidak ada data yang ditampilkan

### 5. Test Backend Restart

```bash
# Restart backend
cd backend
npm start
```

**Expected:**
- Frontend otomatis reconnect dalam 1 detik
- Data kembali muncul (jika logger masih running)

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   ESP32     │ (Future: akan kirim data real)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│              BACKEND (Node.js)                  │
│                                                 │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │ BackgroundLogger │───▶│  MySQL Database  │  │
│  │ (Generate Data)  │    │  (sensor_data)   │  │
│  └──────────────────┘    └──────────────────┘  │
│                                  │              │
│                                  ▼              │
│                          ┌──────────────────┐  │
│                          │ SensorController │  │
│                          │  getRealtimeData │  │
│                          └──────────────────┘  │
│                                  │              │
└──────────────────────────────────┼──────────────┘
                                   │
                    GET /api/sensors/realtime
                                   │
                                   ▼
┌─────────────────────────────────────────────────┐
│            FRONTEND (React)                     │
│                                                 │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │ sensorService.js │───▶│ LoggerContext.jsx│  │
│  │ getRealtimeData()│    │ fetchRealtimeData│  │
│  └──────────────────┘    └──────────────────┘  │
│                                  │              │
│                                  ▼              │
│                          ┌──────────────────┐  │
│                          │   Dashboard.jsx  │  │
│                          │   (Display Data) │  │
│                          └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 🔮 Next Steps (Future Integration dengan ESP32)

Ketika ESP32 sudah siap mengirim data real:

### 1. ESP32 Setup

```cpp
// ESP32 Code (Arduino)
#include <WiFi.h>
#include <HTTPClient.h>

void sendSensorData() {
    HTTPClient http;
    http.begin("http://192.168.1.100:3000/api/sensors");
    http.addHeader("Content-Type", "application/json");
    
    String jsonData = "{";
    jsonData += "\"sensor_id\":\"H1\",";
    jsonData += "\"sensor_type\":\"humidity\",";
    jsonData += "\"value\":" + String(readHumiditySensor()) + ",";
    jsonData += "\"unit\":\"%\",";
    jsonData += "\"status\":\"active\"";
    jsonData += "}";
    
    int httpCode = http.POST(jsonData);
    http.end();
}
```

### 2. Backend Modification

Tidak perlu perubahan! Backend sudah siap menerima data dari ESP32 melalui:
```
POST http://localhost:3000/api/sensors
```

### 3. Remove BackgroundLogger

Ketika ESP32 sudah mengirim data real, hapus/disable `BackgroundLogger`:

```javascript
// backend/src/controllers/LoggerController.js
// Comment out atau hapus start logger functionality
```

---

## 📝 Catatan Penting

1. **Interval Fetch:** Frontend fetch data setiap 1 detik. Bisa diubah jika perlu:
   ```javascript
   const intervalId = setInterval(fetchRealtimeData, 1000); // 1000ms = 1 detik
   ```

2. **Error Handling:** Frontend sudah handle error ketika backend mati dengan graceful degradation

3. **Performance:** Endpoint `/sensors/realtime` hanya mengambil 100 record terakhir untuk performa optimal

4. **Pump Status & Water Weight:** Saat ini masih hardcoded `false` dan `0`. Nanti akan diambil dari ESP32

5. **Database:** Pastikan MySQL running dan database `iot_desalinasi` sudah dibuat

---

## 🐛 Troubleshooting

### Problem: Dashboard tidak menampilkan data

**Solution:**
1. Cek backend running: `http://localhost:3000/api`
2. Cek database ada data: `http://localhost:3000/api/sensors?limit=10`
3. Start logger: `POST http://localhost:3000/api/logger/start`
4. Cek console browser untuk error

### Problem: Error "Network Error"

**Solution:**
1. Pastikan backend running di port 3000
2. Cek CORS settings di backend
3. Cek frontend API base URL di `frontend/src/services/api.js`

### Problem: Data tidak update

**Solution:**
1. Cek logger status: `GET http://localhost:3000/api/logger/status`
2. Restart logger jika perlu
3. Clear browser cache
4. Check browser console untuk error

---

## ✅ Checklist Implementasi

- [x] Backend: Tambah endpoint `/api/sensors/realtime`
- [x] Backend: Tambah method `getRealtimeData()` di SensorController
- [x] Backend: Tambah route untuk realtime endpoint
- [x] Frontend: Tambah method `getRealtimeData()` di sensorService
- [x] Frontend: Update LoggerContext untuk fetch data dari backend
- [x] Frontend: Implement error handling untuk backend offline
- [x] Testing: Test dengan backend running
- [x] Testing: Test dengan backend stopped
- [x] Documentation: Buat dokumentasi lengkap
- [ ] Future: Integrasi dengan ESP32 real
- [ ] Future: Implement pump status dari ESP32
- [ ] Future: Implement water weight dari ESP32

---

**Dibuat:** 2026-01-07  
**Versi:** 1.0  
**Status:** ✅ Implemented & Tested
