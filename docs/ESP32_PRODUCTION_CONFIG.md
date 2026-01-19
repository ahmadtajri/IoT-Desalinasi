# 📡 Konfigurasi ESP32 untuk Production

Panduan mengubah kode ESP32 agar terhubung ke server production.

---

## 🔄 Perubahan yang Diperlukan

Setelah backend di-deploy ke Railway/Render, Anda perlu mengupdate URL di kode ESP32.

---

## 📁 File: ESP32_Humidity_FIXED.ino

### Sebelum (Development - Lokal)
```cpp
// ========== KONFIGURASI SERVER ==========
const char* serverUrl = "http://192.168.1.100:3000/api/esp32/humidity";
```

### Sesudah (Production - Railway)
```cpp
// ========== KONFIGURASI SERVER ==========
const char* serverUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/humidity";
```

---

## 📁 File: ESP32_Temperature_FIXED.ino

### Sebelum (Development - Lokal)
```cpp
// ========== KONFIGURASI SERVER ==========
const char* serverUrl = "http://192.168.1.100:3000/api/esp32/temperature";
```

### Sesudah (Production - Railway)
```cpp
// ========== KONFIGURASI SERVER ==========
const char* serverUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/temperature";
```

---

## 📁 File: ESP32_Water_Control.ino

### Sebelum (Development - Lokal)
```cpp
// ========== KONFIGURASI SERVER ==========
const char* waterLevelUrl = "http://10.10.53.162:3000/api/esp32/waterlevel";
const char* waterWeightUrl = "http://10.10.53.162:3000/api/esp32/waterweight";
const char* valveStatusUrl = "http://10.10.53.162:3000/api/esp32/valve";
```

### Sesudah (Production - Railway)
```cpp
// ========== KONFIGURASI SERVER ==========
const char* waterLevelUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/waterlevel";
const char* waterWeightUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/waterweight";
const char* valveStatusUrl = "https://iot-desalinasi-backend-production.up.railway.app/api/esp32/valve";
```

---

## ⚠️ Penting: HTTPS pada ESP32

Untuk koneksi **HTTPS** (production), Anda **HARUS** mengubah cara koneksi HTTP.

### Tambahkan Library
```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
```

### Modifikasi Fungsi Send Data

**SEBELUM** (HTTP biasa):
```cpp
void sendDataToServer() {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonData);
  http.end();
}
```

**SESUDAH** (HTTPS):
```cpp
void sendDataToServer() {
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate verification (untuk development)
  
  HTTPClient http;
  http.begin(client, serverUrl); // Gunakan secure client
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonData);
  
  if (httpCode == 200) {
    Serial.println("✓ Data sent successfully");
  } else {
    Serial.printf("✗ HTTP Error: %d\n", httpCode);
    Serial.println(http.getString());
  }
  
  http.end();
}
```

---

## 🔧 Contoh Lengkap: Fungsi Send dengan HTTPS

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Global secure client
WiFiClientSecure secureClient;

void setup() {
  Serial.begin(115200);
  
  // Skip certificate verification
  // Untuk production sebenarnya, gunakan root CA certificate
  secureClient.setInsecure();
  
  // Connect WiFi...
}

void sendHumidityData(float rh1, float rh2 /* ... */) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // Create JSON
  StaticJsonDocument<512> doc;
  doc["RH1"] = rh1;
  doc["RH2"] = rh2;
  // ... tambahkan sensor lain
  
  String jsonData;
  serializeJson(doc, jsonData);
  
  // Send via HTTPS
  HTTPClient http;
  http.begin(secureClient, "https://YOUR-BACKEND.railway.app/api/esp32/humidity");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout
  
  int httpCode = http.POST(jsonData);
  
  if (httpCode == 200) {
    Serial.println("✓ Humidity data sent!");
    String response = http.getString();
    Serial.println(response);
  } else if (httpCode == -1) {
    Serial.println("✗ Connection failed");
  } else {
    Serial.printf("✗ HTTP Error: %d\n", httpCode);
  }
  
  http.end();
}
```

---

## 🌐 Dual Mode: Development & Production

Untuk kemudahan testing, Anda bisa membuat kode yang bisa switch antara development dan production:

```cpp
// ========== MODE SELECTION ==========
#define PRODUCTION_MODE false  // Ubah ke true untuk production

// ========== KONFIGURASI SERVER ==========
#if PRODUCTION_MODE
  // Production URLs (Railway/Render)
  const char* humidityUrl = "https://iot-desalinasi-backend.up.railway.app/api/esp32/humidity";
  const char* temperatureUrl = "https://iot-desalinasi-backend.up.railway.app/api/esp32/temperature";
  const char* waterLevelUrl = "https://iot-desalinasi-backend.up.railway.app/api/esp32/waterlevel";
  const bool useHTTPS = true;
#else
  // Development URLs (Local)
  const char* humidityUrl = "http://192.168.1.100:3000/api/esp32/humidity";
  const char* temperatureUrl = "http://192.168.1.100:3000/api/esp32/temperature";
  const char* waterLevelUrl = "http://192.168.1.100:3000/api/esp32/waterlevel";
  const bool useHTTPS = false;
#endif

// Fungsi send yang adaptif
void sendData(const char* url, String jsonData) {
  HTTPClient http;
  
  if (useHTTPS) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure();
    http.begin(secureClient, url);
  } else {
    http.begin(url);
  }
  
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(jsonData);
  
  Serial.printf("%s: %d\n", url, code);
  http.end();
}
```

---

## 🔍 Troubleshooting

### Error: "Connection refused"
- Pastikan URL backend benar
- Pastikan backend sudah running
- Cek apakah ada typo di URL

### Error: "SSL handshake failed"
- Tambahkan `secureClient.setInsecure();`
- Atau download root CA certificate untuk Let's Encrypt

### Error: "HTTP -1"
- Timeout - tambahkan `http.setTimeout(15000);`
- Cek koneksi WiFi
- Pastikan server tidak blocked

### Error: "HTTP 404"
- Endpoint URL salah
- Cek path API di backend

### Error: "HTTP 500"
- Server error - cek logs di Railway/Render
- Pastikan JSON format benar

---

## ✅ Checklist Sebelum Upload ke ESP32

- [ ] URL backend sudah diganti ke production URL
- [ ] WiFi SSID dan password sudah benar
- [ ] Menggunakan WiFiClientSecure untuk HTTPS
- [ ] `setInsecure()` sudah dipanggil
- [ ] Timeout sudah diset (minimal 10 detik)
- [ ] Test Serial Monitor untuk debug

---

## 📝 Template URL

Ganti `YOUR-BACKEND-URL` dengan URL Railway/Render Anda:

```cpp
// Railway format:
const char* baseUrl = "https://[PROJECT-NAME]-production.up.railway.app";

// Render format:  
const char* baseUrl = "https://[SERVICE-NAME].onrender.com";

// Endpoints:
// POST /api/esp32/humidity     - Data kelembapan (RH1-RH7)
// POST /api/esp32/temperature  - Data suhu (T1-T15)
// POST /api/esp32/waterlevel   - Data level air (WL1)
// POST /api/esp32/waterweight  - Data berat air (WW1)
// POST /api/esp32/valve        - Status valve
```

