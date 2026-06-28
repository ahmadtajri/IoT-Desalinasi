/**
 * MQTT Service
 * Handles MQTT connection and message processing from ESP32 devices
 * 
 * FLEXIBLE SENSOR SYSTEM:
 * - All sensors are discovered as 'uncategorized' by default
 * - Admin manually categorizes sensors via Admin Panel
 * - No automatic categorization based on sensor ID prefix
 * 
 * Topics ESP32:
 * - esp32/sensors         → Generic sensor data { "S1": 25.5, "S2": 70.0, ... }
 * - esp32/suhu           → Temperature data from ESP32 (any ID format)
 * - esp32/kelembapan     → Humidity data from ESP32 (any ID format)
 * - esp32/waterlevel     → Water level data from ESP32
 * - esp32/waterweight    → Water weight data from ESP32
 * - esp32/valve          → Valve status from ESP32
 */

const mqtt = require('mqtt');
const prisma = require('../config/prisma');

// MQTT Configuration
const MQTT_CONFIG = {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
    options: {
        clientId: `iot_desalinasi_backend_${Date.now()}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || ''
    }
};

// MQTT Topics - Updated to support generic sensors
const TOPICS = {
    // NEW: Generic sensor topic (preferred for flexible system)
    SENSORS: 'esp32/sensors',

    // DHT22 Sensor Topics (ESP32 Humidity) - Legacy
    SUHU: 'esp32/suhu',
    KELEMBAPAN: 'esp32/kelembapan',

    // Water Control Topics (ESP32 Water Control)
    WATERLEVEL: 'esp32/waterlevel',
    WATERWEIGHT: 'esp32/waterweight',
    VALVE: 'esp32/valve',

    // Legacy topics (for backward compatibility)
    TEMPERATURE: 'iot/desalinasi/temperature',
    HUMIDITY: 'iot/desalinasi/humidity',

    // Wildcard to subscribe to all esp32 topics
    ALL_ESP32: 'esp32/#',
    ALL_IOT: 'iot/desalinasi/#'
};

// Sensor timeout configuration - REALTIME MODE
const SENSOR_TIMEOUT_MS = 8000;     // 8 seconds - sensor inactive jika tidak ada data (REALTIME)
const CLEANUP_INTERVAL_MS = 1000;   // 1 second - interval cek sensor (REALTIME)

// In-memory cache for real-time data (shared with ESP32Controller)
// NEW: Added generic sensors cache
const realtimeCache = {
    // NEW: Generic sensors cache - stores all sensors regardless of type
    sensors: {},

    // Legacy caches (for backward compatibility)
    temperature: {},
    humidity: {},
    waterLevel: {},
    waterWeight: {},
    valveStatus: { status: 'closed', level: 0, timestamp: null },
    lastUpdate: null
};

let mqttClient = null;
let isConnected = false;
let cleanupInterval = null;
let lastThresholdPublishAt = 0;
const THRESHOLD_PUBLISH_COOLDOWN_MS = 5000;

// Store all discovered sensors - enhanced for flexible system
// Map<sensorId, { sensorId, suggestedCategory, firstSeenAt, lastSeenAt, lastValue }>
const discoveredSensors = new Map();

/**
 * Register a discovered sensor - flexible system without auto-categorization
 * @param {string} sensorId - Sensor ID (e.g., "T1", "RH1", "WL1")
 * @param {string} suggestedCategory - Category (default: 'uncategorized', admin will categorize manually)
 * @param {number} value - Current sensor value
 */
function registerDiscoveredSensor(sensorId, suggestedCategory, value = null) {
    // Only register if valid ID
    if (!sensorId) return;

    const now = new Date().toISOString();

    if (!discoveredSensors.has(sensorId)) {
        console.log(`[MQTT] 🆕 New sensor discovered: ${sensorId} (category: ${suggestedCategory})`);
        discoveredSensors.set(sensorId, {
            sensorId,
            suggestedCategory, // default 'uncategorized' - admin will set category
            firstSeenAt: now,
            lastSeenAt: now,
            lastValue: value,
            dataCount: 1
        });
    } else {
        // Update existing sensor info
        const existing = discoveredSensors.get(sensorId);
        existing.lastSeenAt = now;
        existing.lastValue = value;
        existing.dataCount = (existing.dataCount || 0) + 1;
        // Note: No auto-update of category anymore
        discoveredSensors.set(sensorId, existing);
    }
}

async function publishStoredValveThresholds(reason) {
    const now = Date.now();
    if (now - lastThresholdPublishAt < THRESHOLD_PUBLISH_COOLDOWN_MS) {
        return;
    }

    try {
        const config = await prisma.valveConfig.findFirst();
        if (!config) {
            return;
        }

        if (typeof config.onThreshold !== 'number' || typeof config.offThreshold !== 'number') {
            return;
        }

        if (!mqttClient || !isConnected) {
            return;
        }

        const payload = {
            command: 'set_thresholds',
            onThreshold: config.onThreshold,
            offThreshold: config.offThreshold,
            reason: reason || 'auto_sync'
        };

        mqttClient.publish('esp32/valve/control', JSON.stringify(payload), { qos: 1 });
        lastThresholdPublishAt = now;
        console.log('[MQTT] Re-pushed valve thresholds from DB');
    } catch (error) {
        console.error('[MQTT] Failed to publish stored valve thresholds:', error);
    }
}

/**
 * Check and mark inactive sensors based on timeout
 */
function checkAndMarkInactiveSensors() {
    const now = Date.now();
    let markedInactive = 0;

    // Check all cache types
    const cacheTypes = ['temperature', 'humidity', 'waterLevel', 'waterWeight'];

    for (const cacheType of cacheTypes) {
        const cache = realtimeCache[cacheType];
        if (!cache) continue;

        for (const [sensorId, data] of Object.entries(cache)) {
            if (data.status === 'active') {
                const lastReceived = new Date(data.receivedAt).getTime();
                const timeSinceLastData = now - lastReceived;

                if (timeSinceLastData > SENSOR_TIMEOUT_MS) {
                    data.status = 'inactive';
                    markedInactive++;
                    console.log(`[MQTT] ⏱️  Sensor ${sensorId} marked INACTIVE (no data for ${Math.round(timeSinceLastData / 1000)}s)`);
                }
            }
        }
    }

    return markedInactive;
}

/**
 * Get all discovered sensors with enhanced info
 * ONLY returns sensors that are currently ACTIVE (have status='active')
 */
function getDiscoveredSensors() {
    // First, check and mark inactive sensors
    checkAndMarkInactiveSensors();

    const activeSensors = [];

    // Filter only sensors that are currently active in the cache
    for (const [sensorId, info] of discoveredSensors.entries()) {
        let isActive = false;

        // Check if sensor is active in any cache
        if (realtimeCache.temperature?.[sensorId]?.status === 'active') {
            isActive = true;
        } else if (realtimeCache.humidity?.[sensorId]?.status === 'active') {
            isActive = true;
        } else if (realtimeCache.waterLevel?.[sensorId]?.status === 'active') {
            isActive = true;
        } else if (realtimeCache.waterWeight?.[sensorId]?.status === 'active') {
            isActive = true;
        }

        // Only include active sensors
        if (isActive) {
            activeSensors.push(info);
        }
    }

    return activeSensors.sort((a, b) => {
        // Sort by sensorId naturally (S1, S2, S10, etc.)
        return a.sensorId.localeCompare(b.sensorId, undefined, { numeric: true });
    });
}

/**
 * Initialize MQTT connection
 */
function connect() {
    return new Promise((resolve, reject) => {
        console.log('');
        console.log('📡 MQTT Service Starting...');
        console.log(`   Broker: ${MQTT_CONFIG.broker}`);

        mqttClient = mqtt.connect(MQTT_CONFIG.broker, MQTT_CONFIG.options);

        mqttClient.on('connect', () => {
            isConnected = true;
            console.log('✅ MQTT Connected to broker');

            // Subscribe to all ESP32 topics
            const subscribeTopics = [TOPICS.ALL_ESP32, TOPICS.ALL_IOT];

            mqttClient.subscribe(subscribeTopics, { qos: 1 }, (err) => {
                if (err) {
                    console.error('❌ MQTT Subscribe error:', err);
                    reject(err);
                } else {
                    console.log('✅ MQTT Subscribed to:');
                    console.log(`   - ${TOPICS.ALL_ESP32}`);
                    console.log(`   - ${TOPICS.ALL_IOT}`);
                    console.log('');
                    console.log('📥 Listening for ESP32 messages on:');
                    console.log(`   - ${TOPICS.SUHU} (Temperature from DHT22)`);
                    console.log(`   - ${TOPICS.KELEMBAPAN} (Humidity from DHT22)`);
                    console.log(`   - ${TOPICS.WATERLEVEL}`);
                    console.log(`   - ${TOPICS.WATERWEIGHT}`);
                    console.log(`   - ${TOPICS.VALVE}`);
                    console.log('');

                    // Start cleanup interval for inactive sensors
                    startCleanupInterval();

                    publishStoredValveThresholds('mqtt_connect');

                    resolve();
                }
            });
        });

        mqttClient.on('message', (topic, message) => {
            handleMessage(topic, message);
        });

        mqttClient.on('error', (err) => {
            console.error('❌ MQTT Error:', err);
            isConnected = false;
        });

        mqttClient.on('close', () => {
            console.log('⚠️ MQTT Connection closed');
            isConnected = false;
        });

        mqttClient.on('reconnect', () => {
            console.log('🔄 MQTT Reconnecting...');
        });

        // Timeout for initial connection
        setTimeout(() => {
            if (!isConnected) {
                console.warn('⚠️ MQTT connection timeout - continuing without MQTT');
                resolve(); // Don't reject, allow server to start
            }
        }, 10000);
    });
}

/**
 * Handle incoming MQTT messages
 */
function handleMessage(topic, message) {
    try {
        let messageStr = message.toString();

        // Fix invalid JSON: replace nan with null
        // ESP32 kadang mengirim "nan" yang bukan valid JSON
        messageStr = messageStr.replace(/\bnan\b/gi, 'null');
        messageStr = messageStr.replace(/\binf\b/gi, 'null');

        const data = JSON.parse(messageStr);
        const timestamp = new Date().toISOString();
        const now = Date.now();

        console.log(`[MQTT] Received on ${topic}:`, JSON.stringify(data));

        // Route based on topic
        switch (topic) {
            // NEW: Generic sensors topic (preferred)
            case TOPICS.SENSORS:
            case 'esp32/sensors':
                processGenericSensors(data, timestamp, now);
                break;

            // Primary topics (from user's ESP32) - legacy support
            case TOPICS.SUHU:
            case TOPICS.TEMPERATURE:
                processTemperature(data, timestamp, now);
                break;

            case TOPICS.KELEMBAPAN:
            case TOPICS.HUMIDITY:
                processHumidity(data, timestamp, now);
                break;

            case TOPICS.WATERLEVEL:
            case 'iot/desalinasi/waterlevel':
                processWaterLevel(data, timestamp, now);
                break;

            case TOPICS.WATERWEIGHT:
            case 'iot/desalinasi/waterweight':
                processWaterWeight(data, timestamp, now);
                break;

            case TOPICS.VALVE:
            case 'iot/desalinasi/valve':
                processValveStatus(data, timestamp, now);
                break;

            default:
                // Try to match pattern for unknown topics
                if (topic.includes('sensors')) {
                    processGenericSensors(data, timestamp, now);
                } else if (topic.includes('suhu') || topic.includes('temperature')) {
                    processTemperature(data, timestamp, now);
                } else if (topic.includes('kelembapan') || topic.includes('humidity')) {
                    processHumidity(data, timestamp, now);
                } else if (topic.includes('waterlevel') || topic.includes('level')) {
                    processWaterLevel(data, timestamp, now);
                } else if (topic.includes('waterweight') || topic.includes('weight')) {
                    processWaterWeight(data, timestamp, now);
                } else if (topic.includes('valve')) {
                    processValveStatus(data, timestamp, now);
                } else {
                    console.log(`[MQTT] Unknown topic: ${topic}`);
                }
        }

        realtimeCache.lastUpdate = timestamp;

    } catch (error) {
        console.error('[MQTT] Error processing message:', error);
    }
}

/**
 * NEW: Process generic sensor data
 * Expected format: { "S1": 25.5, "S2": 70.0, "S3": 45.0, ... }
 * Supports any sensor ID format (S1, T1, RH1, WL1, etc.)
 */
function processGenericSensors(data, timestamp, now) {
    let validCount = 0;

    for (const [sensorId, value] of Object.entries(data)) {
        // Validate value (skip null, NaN, non-numbers)
        if (value === null || typeof value !== 'number' || isNaN(value)) {
            console.log(`[MQTT] Skipping invalid value for ${sensorId}: ${value}`);
            continue;
        }

        // Store in generic sensors cache
        realtimeCache.sensors[sensorId] = {
            value: value,
            timestamp: timestamp,
            receivedAt: now,
            status: 'active'
        };

        // NO AUTO-CATEGORIZATION - Admin will categorize manually
        // All sensors are discovered as 'uncategorized' by default
        const suggestedCategory = 'uncategorized';

        // Register discovery
        registerDiscoveredSensor(sensorId, suggestedCategory, value);

        // NOTE: Legacy caches (temperature, humidity, etc.) are populated
        // by specific topic handlers (processTemperature, processHumidity, etc.)
        // No auto-population here since we don't auto-categorize

        validCount++;
    }

    console.log(`[MQTT] Generic Sensors: ${validCount} sensors updated`);
}

/**
 * Process temperature data
 * Expected format: { "T1": 25.5, "T2": 26.0, ..., "T_X": 28.0 }
 * Also supports generic format for backward compatibility
 */
function processTemperature(data, timestamp, now) {
    let validCount = 0;

    for (const [sensorId, value] of Object.entries(data)) {
        // Accept any sensor ID format - no validation
        // Validate value only (skip null, NaN, non-numbers)
        if (value === null || typeof value !== 'number' || isNaN(value)) {
            console.log(`[MQTT] Skipping invalid value for ${sensorId}: ${value}`);
            continue;
        }

        // Validate temperature range
        if (value < -40 || value > 80) continue;

        // Map T_X to a consistent ID if needed
        const normalizedId = sensorId;

        realtimeCache.temperature[normalizedId] = {
            value: value,
            timestamp: timestamp,
            receivedAt: now,
            status: 'active'
        };

        // Also store in generic sensors cache
        realtimeCache.sensors[normalizedId] = realtimeCache.temperature[normalizedId];

        // NO AUTO-CATEGORIZATION - Admin will categorize manually
        registerDiscoveredSensor(normalizedId, 'uncategorized', value);

        validCount++;
    }

    console.log(`[MQTT] Temperature: ${validCount} sensors updated`);
}

/**
 * Process humidity data
 * Expected format: { "RH1": 65.0, "RH2": 70.0, ..., "RH_X": 68.0 }
 * More flexible - accepts RH followed by any number
 */
function processHumidity(data, timestamp, now) {
    let validCount = 0;

    for (const [sensorId, value] of Object.entries(data)) {
        // Accept any sensor ID format - no validation
        // Validate value only (skip null, NaN, non-numbers)
        if (value === null || typeof value !== 'number' || isNaN(value)) {
            console.log(`[MQTT] Skipping invalid value for ${sensorId}: ${value}`);
            continue;
        }

        // Validate humidity range
        if (value < 0 || value > 100) continue;

        realtimeCache.humidity[sensorId] = {
            value: value,
            timestamp: timestamp,
            receivedAt: now,
            status: 'active'
        };

        // Also store in generic sensors cache
        realtimeCache.sensors[sensorId] = realtimeCache.humidity[sensorId];

        // NO AUTO-CATEGORIZATION - Admin will categorize manually
        registerDiscoveredSensor(sensorId, 'uncategorized', value);

        validCount++;
    }

    console.log(`[MQTT] Humidity: ${validCount} sensors updated`);
}

/**
 * Process water level data
 * Expected format: { "WL1": 75 }
 * More flexible - accepts WL followed by any number
 */
function processWaterLevel(data, timestamp, now) {
    let validCount = 0;

    if (data && typeof data === 'object') {
        const valvePayload = data.valve || data.valveStatus;
        if (valvePayload && typeof valvePayload === 'object') {
            processValveStatus(valvePayload, timestamp, now);
        } else if (data.status && (data.status === 'open' || data.status === 'closed')) {
            processValveStatus(data, timestamp, now);
        }
    }

    const valveKeys = new Set(['valve', 'valveStatus', 'status', 'mode', 'level', 'distance']);

    for (const [sensorId, value] of Object.entries(data)) {
        if (valveKeys.has(sensorId)) {
            continue;
        }
        // Accept any sensor ID format - no validation
        // Validate value only
        if (typeof value !== 'number' || isNaN(value)) {
            console.log(`[MQTT] Skipping invalid value for ${sensorId}: ${value}`);
            continue;
        }

        // Validate water level range
        if (value < 0 || value > 100) continue;

        realtimeCache.waterLevel[sensorId] = {
            value: value,
            timestamp: timestamp,
            receivedAt: now,
            status: 'active'
        };

        // Also store in generic sensors cache
        realtimeCache.sensors[sensorId] = realtimeCache.waterLevel[sensorId];

        // NO AUTO-CATEGORIZATION - Admin will categorize manually
        registerDiscoveredSensor(sensorId, 'uncategorized', value);

        validCount++;
    }

    console.log(`[MQTT] Water Level: ${validCount} sensors updated`);
}

/**
 * Process water weight data
 * Expected format: { "WW1": 500.5 }
 * More flexible - accepts WW followed by any number
 */
function processWaterWeight(data, timestamp, now) {
    let validCount = 0;

    for (const [sensorId, value] of Object.entries(data)) {
        // Accept any sensor ID format - no validation
        // Validate value only
        if (typeof value !== 'number' || isNaN(value)) {
            console.log(`[MQTT] Skipping invalid value for ${sensorId}: ${value}`);
            continue;
        }

        realtimeCache.waterWeight[sensorId] = {
            value: value,
            timestamp: timestamp,
            receivedAt: now,
            status: 'active'
        };

        // Also store in generic sensors cache
        realtimeCache.sensors[sensorId] = realtimeCache.waterWeight[sensorId];

        // NO AUTO-CATEGORIZATION - Admin will categorize manually
        registerDiscoveredSensor(sensorId, 'uncategorized', value);

        validCount++;
    }

    console.log(`[MQTT] Water Weight: ${validCount} sensors updated`);
}

/**
 * Process valve status
 * Expected format: { "status": "open" | "closed", "mode": "auto" | "manual", "level": 15.5, "distance": 5.2 }
 */
function processValveStatus(data, timestamp, now) {
    const { status, mode, level, distance, onThreshold, offThreshold } = data;

    if (status && (status === 'open' || status === 'closed')) {
        realtimeCache.valveStatus = {
            status: status,
            mode: mode || 'unknown',
            level: level || 0,
            distance: distance || 0,
            timestamp: timestamp,
            receivedAt: now
        };
        console.log(`[MQTT] Valve status: ${status.toUpperCase()} (${mode || 'unknown'} mode)`);
    }

    if (typeof onThreshold === 'number' && typeof offThreshold === 'number') {
        if (onThreshold < 0 || offThreshold < 0) {
            publishStoredValveThresholds('esp32_threshold_unset');
        }
    }
}

/**
 * Get the current cache
 */
function getCache() {
    const CACHE_TTL = 30000; // 30 seconds
    const now = Date.now();
    const processedCache = JSON.parse(JSON.stringify(realtimeCache));

    // Helper to check expiry
    const checkExpiry = (category) => {
        if (!processedCache[category]) return;
        for (const sensorId in processedCache[category]) {
            const sensor = processedCache[category][sensorId];
            if (sensor.receivedAt && (now - sensor.receivedAt > CACHE_TTL)) {
                sensor.status = 'inactive';
            }
        }
    };

    checkExpiry('sensors'); // NEW: check generic sensors cache
    checkExpiry('humidity');
    checkExpiry('temperature');
    checkExpiry('waterLevel');
    checkExpiry('waterWeight');

    return processedCache;
}

/**
 * Clear the cache
 */
function clearCache() {
    realtimeCache.sensors = {}; // NEW: clear generic sensors
    realtimeCache.temperature = {};
    realtimeCache.humidity = {};
    realtimeCache.waterLevel = {};
    realtimeCache.waterWeight = {};
    realtimeCache.valveStatus = { status: 'closed', level: 0, timestamp: null };
    realtimeCache.lastUpdate = null;
    console.log('[MQTT] Cache cleared');
}

/**
 * Publish a message to a topic
 */
function publish(topic, message) {
    if (!mqttClient || !isConnected) {
        console.error('[MQTT] Cannot publish - not connected');
        return false;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    mqttClient.publish(topic, payload, { qos: 1 });
    console.log(`[MQTT] Published to ${topic}:`, payload);
    return true;
}

/**
 * Start cleanup interval to check for inactive sensors
 */
function startCleanupInterval() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    cleanupInterval = setInterval(() => {
        checkAndMarkInactiveSensors();
    }, CLEANUP_INTERVAL_MS);

    console.log(`⏱️  Sensor cleanup interval started (check every ${CLEANUP_INTERVAL_MS / 1000}s, timeout: ${SENSOR_TIMEOUT_MS / 1000}s)`);
}

/**
 * Disconnect from MQTT broker
 */
function disconnect() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }

    if (mqttClient) {
        mqttClient.end();
        console.log('[MQTT] Disconnected');
    }
}

/**
 * Check if connected
 */
function getConnectionStatus() {
    return isConnected;
}

/**
 * Check if connected (alias)
 */
function isConnectedStatus() {
    return isConnected;
}

module.exports = {
    connect,
    disconnect,
    getCache,
    clearCache,
    publish,
    getConnectionStatus,
    isConnected: isConnectedStatus,
    getDiscoveredSensors,
    TOPICS
};
