/**
 * ESP32 #1 - Temperature Sensors
 * Monitors 7 DS18B20 temperature sensors
 * Sends data to backend API every 5 seconds
 * 
 * Pin Configuration:
 * - T11 = GPIO 16
 * - T10 = GPIO 13
 * - T7  = GPIO 22
 * - T8  = GPIO 32
 * - T9  = GPIO 19
 * - T12 = GPIO 18
 * - T_extra (dekat keluar AC) = GPIO 21
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>

const char* ssid = "UHAMKA-FTII";           // Ganti dengan SSID WiFi Anda
const char* password = "buyahamka123";   // Ganti dengan password WiFi Anda

// Server URL
// PENTING: Gunakan endpoint /api/esp32/temperature untuk format {"T7": value, "T8": value, ...}
// JANGAN gunakan /api/sensors (endpoint lama untuk format compartment-based)
const char* serverUrl = "http://10.10.53.162:3000/api/esp32/temperature";  // Ganti dengan IP server Anda

// Pin definitions for DS18B20 sensors
#define PIN_T7  22
#define PIN_T8  32
#define PIN_T9  13
#define PIN_T10 27
#define PIN_T11 25 
#define PIN_T12 18
#define PIN_T_EXTRA 21

// Create OneWire instances
OneWire oneWire_T7(PIN_T7);
OneWire oneWire_T8(PIN_T8);
OneWire oneWire_T9(PIN_T9);
OneWire oneWire_T10(PIN_T10);
OneWire oneWire_T11(PIN_T11);
OneWire oneWire_T12(PIN_T12);
OneWire oneWire_T_extra(PIN_T_EXTRA);

// Create DallasTemperature instances
DallasTemperature sensor_T7(&oneWire_T7);
DallasTemperature sensor_T8(&oneWire_T8);
DallasTemperature sensor_T9(&oneWire_T9);
DallasTemperature sensor_T10(&oneWire_T10);
DallasTemperature sensor_T11(&oneWire_T11);
DallasTemperature sensor_T12(&oneWire_T12);
DallasTemperature sensor_T_extra(&oneWire_T_extra);

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000;  // Send every 5 seconds

// LED indicator
#define LED_BUILTIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  
  Serial.println("\n\n=================================");
  Serial.println("ESP32 Temperature Sensor System");
  Serial.println("=================================\n");
  
  // Initialize sensors
  Serial.println("Initializing DS18B20 sensors...");
  sensor_T7.begin();
  sensor_T8.begin();
  sensor_T9.begin();
  sensor_T10.begin();
  sensor_T11.begin();
  sensor_T12.begin();
  sensor_T_extra.begin();
  Serial.println("✓ Sensors initialized\n");
  
  // Connect to WiFi
  connectWiFi();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected! Reconnecting...");
    connectWiFi();
  }
  
  // Send data at interval
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    sendTemperatureData();
  }
  
  delay(100);
}

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
    digitalWrite(LED_BUILTIN, LOW);
  }
}

void sendTemperatureData() {
  // Blink LED to indicate reading
  digitalWrite(LED_BUILTIN, LOW);
  
  // Read all sensors
  Serial.println("\n--- Reading Temperature Sensors ---");
  
  sensor_T7.requestTemperatures();
  sensor_T8.requestTemperatures();
  sensor_T9.requestTemperatures();
  sensor_T10.requestTemperatures();
  sensor_T11.requestTemperatures();
  sensor_T12.requestTemperatures();
  sensor_T_extra.requestTemperatures();
  
  float temp_T7 = sensor_T7.getTempCByIndex(0);
  float temp_T8 = sensor_T8.getTempCByIndex(0);
  float temp_T9 = sensor_T9.getTempCByIndex(0);
  float temp_T10 = sensor_T10.getTempCByIndex(0);
  float temp_T11 = sensor_T11.getTempCByIndex(0);
  float temp_T12 = sensor_T12.getTempCByIndex(0);
  float temp_T_extra = sensor_T_extra.getTempCByIndex(0);
  
  // Print readings
  Serial.printf("T7:  %.2f°C\n", temp_T7);
  Serial.printf("T8:  %.2f°C\n", temp_T8);
  Serial.printf("T9:  %.2f°C\n", temp_T9);
  Serial.printf("T10: %.2f°C\n", temp_T10);
  Serial.printf("T11: %.2f°C\n", temp_T11);
  Serial.printf("T12: %.2f°C\n", temp_T12);
  Serial.printf("T_extra: %.2f°C\n", temp_T_extra);
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  
  // Only send valid readings (DS18B20 returns -127 or 85 on error)
  int validSensors = 0;
  if (temp_T7 > -100 && temp_T7 < 100) { doc["T7"] = temp_T7; validSensors++; }
  if (temp_T8 > -100 && temp_T8 < 100) { doc["T8"] = temp_T8; validSensors++; }
  if (temp_T9 > -100 && temp_T9 < 100) { doc["T9"] = temp_T9; validSensors++; }
  if (temp_T10 > -100 && temp_T10 < 100) { doc["T10"] = temp_T10; validSensors++; }
  if (temp_T11 > -100 && temp_T11 < 100) { doc["T11"] = temp_T11; validSensors++; }
  if (temp_T12 > -100 && temp_T12 < 100) { doc["T12"] = temp_T12; validSensors++; }
  if (temp_T_extra > -100 && temp_T_extra < 100) { doc["T13"] = temp_T_extra; validSensors++; }
  
  // Check if we have any valid data
  if (validSensors == 0) {
    Serial.println("\n⚠ Warning: No valid sensor data to send!");
    Serial.println("All sensors returned invalid readings.");
    Serial.println("Please check:");
    Serial.println("  1. DS18B20 sensors are connected properly");
    Serial.println("  2. 4.7kΩ pull-up resistor is installed");
    Serial.println("  3. Power supply is stable");
    Serial.println("Skipping this transmission...\n");
    digitalWrite(LED_BUILTIN, HIGH);
    Serial.println("-----------------------------------\n");
    return;
  }
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.printf("\n📤 Sending to server (%d valid sensors):\n", validSensors);
  Serial.println(jsonPayload);
  
  // Send HTTP POST
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("✓ Response code: %d\n", httpResponseCode);
      Serial.println("Response: " + response);
      
      if (httpResponseCode == 200) {
        Serial.println("✓ Data sent successfully!");
      } else {
        Serial.println("⚠ Data sent but received unexpected response code");
      }
    } else {
      Serial.printf("✗ Error sending data: %s\n", http.errorToString(httpResponseCode).c_str());
      Serial.println("Please check:");
      Serial.println("  1. Server is running (npm run dev in backend folder)");
      Serial.println("  2. Server URL is correct");
      Serial.println("  3. ESP32 and server are on the same network");
    }
    
    http.end();
  } else {
    Serial.println("✗ WiFi not connected!");
  }
  
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("-----------------------------------\n");
}
