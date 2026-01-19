/**
 * ESP32 #3 - Water Control System
 * Monitors:
 * 1. Water Level (Ultrasonic HC-SR04) -> Sends to WL1
 * 2. Water Weight/Production (Load Cell HX711) -> Sends to WW1
 * Controls:
 * 1. Relay Valve (ON/OFF) with Hysteresis
 * 
 * Pin Configuration:
 * - Ultrasonic TRIG  : GPIO 5
 * - Ultrasonic ECHO  : GPIO 18
 * - Relay (Valve)    : GPIO 26
 * - Load Cell DT     : GPIO 32
 * - Load Cell SCK    : GPIO 33
 * 
 * Valve Logic (Hysteresis):
 * - Jarak <= 5 cm (air tinggi) -> Valve OFF
 * - Jarak >= 6 cm (air rendah) -> Valve ON
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "HX711.h"

// ========== KONFIGURASI WiFi ==========
const char* ssid = "UHAMKA-FTII";           // Ganti dengan SSID WiFi Anda
const char* password = "buyahamka123";      // Ganti dengan password WiFi Anda

// ========== KONFIGURASI SERVER ==========
const char* waterLevelUrl = "http://10.10.53.162:3000/api/esp32/waterlevel";
const char* waterWeightUrl = "http://10.10.53.162:3000/api/esp32/waterweight";
const char* valveStatusUrl = "http://10.10.53.162:3000/api/esp32/valve";

// ========== PIN DEFINITIONS ==========
#define TRIG_PIN   5
#define ECHO_PIN   18
#define RELAY_PIN  26
#define HX_DT      32
#define HX_SCK     33

// ========== RELAY LOGIC ==========
#define RELAY_ON   LOW
#define RELAY_OFF  HIGH

// ========== SENSOR CONSTANTS ==========
// Ultrasonic - Tinggi tangki untuk perhitungan persentase
const float TANK_HEIGHT_CM = 100.0; // Tinggi tangki total (cm) - SESUAIKAN!
const float SENSOR_OFFSET_CM = 5.0; // Jarak sensor ke permukaan air saat PENUH (cm)

// Valve Hysteresis Thresholds (dalam cm)
const float VALVE_OFF_THRESHOLD = 5.0;  // Jarak <= 5 cm -> Air tinggi, valve OFF
const float VALVE_ON_THRESHOLD = 6.0;   // Jarak >= 6 cm -> Air rendah, valve ON

// Load Cell
HX711 scale;
float calibration_factor = -120.94;  // Ganti sesuai kalibrasi kamu

// ========== VARIABLES ==========
float jarak = 0;
bool valveState = false;  // false = OFF, true = ON

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000;  // Send every 5 seconds

// LED indicator
#define LED_BUILTIN 2

// ========== ULTRASONIC FUNCTION ==========
float readUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return -1; // Error reading

  return duration * 0.0343 / 2; // Convert to cm
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Setup Ultrasonic
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Setup Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_OFF); // Default OFF
  
  Serial.println("\n\n=============================================");
  Serial.println("ESP32 Water Control System");
  Serial.println("(Ultrasonic + Valve + Load Cell + WiFi)");
  Serial.println("=============================================\n");
  
  // Initialize Load Cell (HX711)
  Serial.println("Initializing Load Cell (HX711)...");
  scale.begin(HX_DT, HX_SCK);
  
  delay(1000); // Wait for stabilization
  
  if (scale.is_ready()) {
    Serial.println("✓ Load Cell is ready.");
    scale.set_scale(calibration_factor);
    scale.tare(); // Reset to 0
    Serial.println("✓ Tare done. Reading set to 0.");
  } else {
    Serial.println("⚠ Load Cell not found / not ready!");
  }
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\n✓ Setup completed!");
  Serial.println("Starting monitoring...\n");
  Serial.println("Valve Thresholds:");
  Serial.printf("  - OFF when distance <= %.1f cm (air tinggi)\n", VALVE_OFF_THRESHOLD);
  Serial.printf("  - ON  when distance >= %.1f cm (air rendah)\n", VALVE_ON_THRESHOLD);
  Serial.println("");
}

// ========== MAIN LOOP ==========
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected! Reconnecting...");
    connectWiFi();
  }
  
  // Read sensors and control valve continuously
  readSensorsAndControlValve();
  
  // Send data to server at interval
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    sendDataToServer();
  }
  
  delay(1000); // Main loop delay
}

// ========== WIFI CONNECTION ==========
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
}

// ========== READ SENSORS & CONTROL VALVE ==========
void readSensorsAndControlValve() {
  Serial.println("\n--- Reading Sensors ---");
  
  // 1. Read Ultrasonic
  jarak = readUltrasonic();
  
  if (jarak > 0 && jarak < 200) {
    Serial.printf("Jarak air: %.2f cm\n", jarak);
    
    // Calculate percentage (dengan sensor offset)
    // Rumus: jarak = SENSOR_OFFSET -> 100%, jarak = TANK_HEIGHT -> 0%
    float effectiveHeight = TANK_HEIGHT_CM - SENSOR_OFFSET_CM; // Tinggi efektif air
    float waterLevelPercent = 0;
    if (jarak <= SENSOR_OFFSET_CM) {
      waterLevelPercent = 100.0; // Air penuh
    } else if (jarak >= TANK_HEIGHT_CM) {
      waterLevelPercent = 0.0; // Tangki kosong
    } else {
      waterLevelPercent = ((TANK_HEIGHT_CM - jarak) / effectiveHeight) * 100.0;
    }
    if (waterLevelPercent < 0) waterLevelPercent = 0;
    if (waterLevelPercent > 100) waterLevelPercent = 100;
    
    Serial.printf("Level: %.2f%%\n", waterLevelPercent);
    
    // ========== VALVE CONTROL WITH HYSTERESIS ==========
    // Jika jarak <= 5 cm (air tinggi) DAN valve sedang ON -> Matikan valve
    if (jarak <= VALVE_OFF_THRESHOLD && valveState == true) {
      digitalWrite(RELAY_PIN, RELAY_OFF);
      valveState = false;
      Serial.println("🔴 VALVE OFF (Air tinggi, jarak <= 5 cm)");
    }
    // Jika jarak >= 6 cm (air rendah) DAN valve sedang OFF -> Nyalakan valve
    else if (jarak >= VALVE_ON_THRESHOLD && valveState == false) {
      digitalWrite(RELAY_PIN, RELAY_ON);
      valveState = true;
      Serial.println("� VALVE ON (Air rendah, jarak >= 6 cm)");
    }
    // Status tetap (hysteresis zone between 5-6 cm)
    else {
      Serial.printf("Valve status: %s (no change)\n", valveState ? "ON" : "OFF");
    }
    
  } else {
    Serial.println("⚠ Ultrasonic read error");
  }
  
  // 2. Read Load Cell
  if (scale.is_ready()) {
    float berat = scale.get_units(10); // Average 10 readings
    if (berat < 0) berat = 0; // Ignore negative
    
    Serial.printf("Berat: %d gram\n", (int)berat);
  } else {
    Serial.println("⚠ HX711 tidak terbaca");
  }
  
  Serial.println("----------------------");
}

// ========== SEND DATA TO SERVER ==========
void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected, skip sending");
    return;
  }
  
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("\n📤 Sending to Server...");
  
  HTTPClient http;
  
  // Calculate water level percentage (dengan sensor offset)
  float effectiveHeight = TANK_HEIGHT_CM - SENSOR_OFFSET_CM;
  float waterLevelPercent = 0;
  if (jarak <= SENSOR_OFFSET_CM) {
    waterLevelPercent = 100.0; // Air penuh
  } else if (jarak >= TANK_HEIGHT_CM) {
    waterLevelPercent = 0.0; // Tangki kosong
  } else if (jarak > 0) {
    waterLevelPercent = ((TANK_HEIGHT_CM - jarak) / effectiveHeight) * 100.0;
  }
  if (waterLevelPercent < 0) waterLevelPercent = 0;
  if (waterLevelPercent > 100) waterLevelPercent = 100;
  
  // --- 1. Send Water Level (WL1) ---
  StaticJsonDocument<200> docLevel;
  docLevel["WL1"] = waterLevelPercent;
  String jsonLevel;
  serializeJson(docLevel, jsonLevel);
  
  http.begin(waterLevelUrl);
  http.addHeader("Content-Type", "application/json");
  int codeLevel = http.POST(jsonLevel);
  
  if (codeLevel == 200) {
    Serial.printf("✓ Level sent: %.2f%%\n", waterLevelPercent);
  } else {
    Serial.printf("✗ Level failed: %d\n", codeLevel);
  }
  http.end();
  
  // --- 2. Send Water Weight (WW1) ---
  float berat = 0;
  if (scale.is_ready()) {
    berat = scale.get_units(5);
    if (berat < 0) berat = 0;
  }
  
  StaticJsonDocument<200> docWeight;
  docWeight["WW1"] = berat;
  String jsonWeight;
  serializeJson(docWeight, jsonWeight);
  
  http.begin(waterWeightUrl);
  http.addHeader("Content-Type", "application/json");
  int codeWeight = http.POST(jsonWeight);
  
  if (codeWeight == 200) {
    Serial.printf("✓ Weight sent: %d g\n", (int)berat);
  } else {
    Serial.printf("✗ Weight failed: %d\n", codeWeight);
  }
  http.end();
  
  // --- 3. Send Valve Status ---
  StaticJsonDocument<200> docValve;
  docValve["status"] = valveState ? "open" : "closed";
  docValve["level"] = waterLevelPercent;
  docValve["distance"] = jarak;
  String jsonValve;
  serializeJson(docValve, jsonValve);
  
  http.begin(valveStatusUrl);
  http.addHeader("Content-Type", "application/json");
  int codeValve = http.POST(jsonValve);
  
  if (codeValve == 200) {
    Serial.printf("✓ Valve status sent: %s\n", valveState ? "OPEN" : "CLOSED");
  } else {
    Serial.printf("✗ Valve status failed: %d\n", codeValve);
  }
  http.end();
  
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("");
}
