/**
 * ESP32 #2 - Humidity & Temperature Sensors (DHT)
 * Monitors 7 DHT22 sensors for humidity and temperature
 * Sends temperature data as T1-T6 + T14
 * Sends humidity data as RH1-RH7
 * 
 * Pin Configuration:
 * - Sensor 1 = GPIO 4   -> T1/RH1
 * - Sensor 2 = GPIO 16  -> T2/RH2
 * - Sensor 3 = GPIO 17  -> T3/RH3
 * - Sensor 4 = GPIO 18  -> T4/RH4
 * - Sensor 5 = GPIO 19  -> T5/RH5
 * - Sensor 6 = GPIO 21  -> T6/RH6
 * - Sensor 7 = GPIO 22  -> T14/RH7
 * 
 * Library yang dibutuhkan:
 * - DHT sensor library by Adafruit
 * - Adafruit Unified Sensor
 * - ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ========== KONFIGURASI WiFi ==========
const char* ssid = "UHAMKA-FTII";           // Ganti dengan SSID WiFi Anda
const char* password = "buyahamka123";      // Ganti dengan password WiFi Anda

// ========== KONFIGURASI SERVER ==========
// Dua endpoint terpisah untuk temperature dan humidity
const char* tempServerUrl = "http://10.10.53.162:3000/api/esp32/temperature"; //seharunya ini ke humidity aja
const char* humidServerUrl = "http://10.10.53.162:3000/api/esp32/humidity";

// ========== PIN DEFINITIONS ==========
#define PIN_SENSOR1  4    // T1/RH1
#define PIN_SENSOR2  16   // T2/RH2
#define PIN_SENSOR3  17   // T3/RH3
#define PIN_SENSOR4  18   // T4/RH4
#define PIN_SENSOR5  19   // T5/RH5
#define PIN_SENSOR6  21   // T6/RH6
#define PIN_SENSOR7  22   // T14/RH7

// ========== DHT CONFIGURATION ==========
#define DHTTYPE DHT22  // atau DHT11 jika menggunakan DHT11

// Create DHT instances
DHT dht1(PIN_SENSOR1, DHTTYPE);
DHT dht2(PIN_SENSOR2, DHTTYPE);
DHT dht3(PIN_SENSOR3, DHTTYPE);
DHT dht4(PIN_SENSOR4, DHTTYPE);
DHT dht5(PIN_SENSOR5, DHTTYPE);
DHT dht6(PIN_SENSOR6, DHTTYPE);
DHT dht7(PIN_SENSOR7, DHTTYPE);

// Timing
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 5000;  // Send every 5 seconds

// LED indicator
#define LED_BUILTIN 2

// Temperature and Humidity arrays
float temperatures[7];
float humidities[7];

// Sensor labels for temperature (T1-T6 + T14)
const char* tempLabels[7] = {"T1", "T2", "T3", "T4", "T5", "T6", "T14"};
// Sensor labels for humidity (RH1-RH7)
const char* humidLabels[7] = {"RH1", "RH2", "RH3", "RH4", "RH5", "RH6", "RH7"};

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  
  Serial.println("\n\n=============================================");
  Serial.println("ESP32 Humidity & Temperature Sensor System");
  Serial.println("(7x DHT22 Sensors)");
  Serial.println("=============================================\n");
  
  // Initialize DHT sensors
  Serial.println("Initializing DHT sensors...");
  dht1.begin();
  dht2.begin();
  dht3.begin();
  dht4.begin();
  dht5.begin();
  dht6.begin();
  dht7.begin();
  
  Serial.println("✓ DHT Sensors initialized");
  Serial.println("  - Sensor 1 (GPIO 4)  -> T1/RH1");
  Serial.println("  - Sensor 2 (GPIO 16) -> T2/RH2");
  Serial.println("  - Sensor 3 (GPIO 17) -> T3/RH3");
  Serial.println("  - Sensor 4 (GPIO 18) -> T4/RH4");
  Serial.println("  - Sensor 5 (GPIO 19) -> T5/RH5");
  Serial.println("  - Sensor 6 (GPIO 21) -> T6/RH6");
  Serial.println("  - Sensor 7 (GPIO 22) -> T14/RH7");
  Serial.println("");
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\n✓ Setup completed!");
  Serial.println("Starting sensor monitoring...\n");
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
    readAndSendData();
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
    Serial.println("Restarting in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
}

void readAndSendData() {
  // Blink LED to indicate reading
  digitalWrite(LED_BUILTIN, LOW);
  
  Serial.println("\n--- Reading DHT Sensors ---");
  
  // Read all sensors
  // Sensor 1
  temperatures[0] = dht1.readTemperature();
  humidities[0] = dht1.readHumidity();
  
  // Sensor 2
  temperatures[1] = dht2.readTemperature();
  humidities[1] = dht2.readHumidity();
  
  // Sensor 3
  temperatures[2] = dht3.readTemperature();
  humidities[2] = dht3.readHumidity();
  
  // Sensor 4
  temperatures[3] = dht4.readTemperature();
  humidities[3] = dht4.readHumidity();
  
  // Sensor 5
  temperatures[4] = dht5.readTemperature();
  humidities[4] = dht5.readHumidity();
  
  // Sensor 6
  temperatures[5] = dht6.readTemperature();
  humidities[5] = dht6.readHumidity();
  
  // Sensor 7
  temperatures[6] = dht7.readTemperature();
  humidities[6] = dht7.readHumidity();
  
  // Print readings
  Serial.println("Temperature Readings:");
  for (int i = 0; i < 7; i++) {
    Serial.printf("  %s (GPIO %d): %.2f°C\n", 
      tempLabels[i], 
      (i == 0 ? PIN_SENSOR1 : (i == 1 ? PIN_SENSOR2 : (i == 2 ? PIN_SENSOR3 : 
       (i == 3 ? PIN_SENSOR4 : (i == 4 ? PIN_SENSOR5 : (i == 5 ? PIN_SENSOR6 : PIN_SENSOR7)))))),
      temperatures[i]);
  }
  
  Serial.println("\nHumidity Readings:");
  for (int i = 0; i < 7; i++) {
    Serial.printf("  %s (GPIO %d): %.2f%%\n", 
      humidLabels[i], 
      (i == 0 ? PIN_SENSOR1 : (i == 1 ? PIN_SENSOR2 : (i == 2 ? PIN_SENSOR3 : 
       (i == 3 ? PIN_SENSOR4 : (i == 4 ? PIN_SENSOR5 : (i == 5 ? PIN_SENSOR6 : PIN_SENSOR7)))))),
      humidities[i]);
  }
  
  // Send Temperature Data
  sendTemperatureData();
  
  // Small delay between requests
  delay(100);
  
  // Send Humidity Data
  sendHumidityData();
  
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("-----------------------------------\n");
}

void sendTemperatureData() {
  // Create JSON payload for temperature
  StaticJsonDocument<512> doc;
  int validSensors = 0;
  
  // Only send valid readings (not NaN and within range)
  for (int i = 0; i < 7; i++) {
    if (!isnan(temperatures[i]) && temperatures[i] > -40 && temperatures[i] < 80) {
      doc[tempLabels[i]] = temperatures[i];
      validSensors++;
    }
  }
  
  // Check if we have any valid data
  if (validSensors == 0) {
    Serial.println("\n⚠ No valid temperature data to send!");
    Serial.println("Skipping temperature transmission...");
    return;
  }
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.printf("\n📤 Sending Temperature (%d sensors):\n", validSensors);
  Serial.println(jsonPayload);
  
  // Send HTTP POST
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(tempServerUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("✓ Temperature Response: %d\n", httpResponseCode);
      
      if (httpResponseCode == 200) {
        Serial.println("✓ Temperature data sent successfully!");
      }
    } else {
      Serial.printf("✗ Temperature Error: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
  }
}

void sendHumidityData() {
  // Create JSON payload for humidity
  StaticJsonDocument<512> doc;
  int validSensors = 0;
  
  // Only send valid readings (not NaN and within range)
  for (int i = 0; i < 7; i++) {
    if (!isnan(humidities[i]) && humidities[i] >= 0 && humidities[i] <= 100) {
      doc[humidLabels[i]] = humidities[i];
      validSensors++;
    }
  }
  
  // Check if we have any valid data
  if (validSensors == 0) {
    Serial.println("\n⚠ No valid humidity data to send!");
    Serial.println("Skipping humidity transmission...");
    return;
  }
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.printf("\n📤 Sending Humidity (%d sensors):\n", validSensors);
  Serial.println(jsonPayload);
  
  // Send HTTP POST
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(humidServerUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("✓ Humidity Response: %d\n", httpResponseCode);
      
      if (httpResponseCode == 200) {
        Serial.println("✓ Humidity data sent successfully!");
      }
    } else {
      Serial.printf("✗ Humidity Error: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
  }
}
