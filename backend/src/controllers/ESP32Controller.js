/**
 * ESP32 Controller
 * Handles API endpoints for ESP32 sensor data
 * 
 * NEW: Supports Generic Sensor Format
 * ESP32 sends { "S1": 25.5, "S2": 70.0, ... } to /api/esp32/sensors
 * Admin maps sensor IDs to categories and names via /api/sensor-config
 * 
 * Data Flow:
 * - ESP32 → MQTT → MqttService → realtimeCache
 * - Frontend → HTTP GET → ESP32Controller → MqttService.getCache()
 * 
 * HTTP endpoints are kept for backward compatibility but MQTT is preferred
 */

const DataService = require('../services/DataService');
const MqttService = require('../services/MqttService');

const ESP32Controller = {
    /**
     * NEW: Receive generic sensor data from ESP32 via HTTP
     * POST /api/esp32/sensors
     * Body: { "S1": 25.5, "S2": 70.0, "S3": 45.0, ... }
     * 
     * This is the PREFERRED endpoint for the flexible sensor system
     * Sensor IDs can be anything (S1, S2, T1, RH1, etc.)
     * Admin will map them to categories via the admin panel
     */
    async receiveGenericSensors(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32-HTTP] Received generic sensor data:', JSON.stringify(data));

            // Validate that we have data
            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No sensor data received',
                    expected: '{ "S1": 25.5, "S2": 70.0, ... }',
                    preferMqtt: 'esp32/sensors'
                });
            }

            // Forward to MQTT for processing (if connected)
            if (MqttService.getConnectionStatus()) {
                MqttService.publish(MqttService.TOPICS.SENSORS, data);
            }

            // Also process directly in case MQTT is not connected
            const sensorCount = Object.keys(data).length;

            res.json({
                success: true,
                message: 'Generic sensor data received',
                received: sensorCount,
                sensorIds: Object.keys(data),
                timestamp: timestamp,
                note: 'Use esp32/sensors MQTT topic for real-time updates'
            });

        } catch (error) {
            console.error('[ESP32-HTTP] Error receiving generic sensors:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive temperature data from ESP32 via HTTP (backup/legacy)
     * POST /api/esp32/temperature
     * Body: { "T1": 25.5, "T2": 26.0, "T3": 27.5, ... }
     * 
     * NOTE: Prefer MQTT topic: iot/desalinasi/temperature
     */
    async receiveTemperature(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32-HTTP] Received temperature data:', JSON.stringify(data));
            console.log('[ESP32-HTTP] ⚠️  Consider using MQTT instead: iot/desalinasi/temperature');

            // Validate that we have data
            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No temperature data received',
                    expected: '{ "T1": 25.5, "T2": 26.0, ... }',
                    preferMqtt: 'iot/desalinasi/temperature'
                });
            }

            // Forward to MQTT for processing (if connected)
            if (MqttService.getConnectionStatus()) {
                MqttService.publish(MqttService.TOPICS.TEMPERATURE, data);
            }

            res.json({
                success: true,
                message: 'Temperature data received (HTTP legacy)',
                received: Object.keys(data).length,
                timestamp: timestamp,
                note: 'Consider switching to MQTT: iot/desalinasi/temperature'
            });

        } catch (error) {
            console.error('[ESP32-HTTP] Error receiving temperature:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive humidity data from ESP32 via HTTP (backup/legacy)
     * POST /api/esp32/humidity
     * Body: { "RH1": 65.0, "RH2": 70.0, "RH3": 68.5, ... }
     * 
     * NOTE: Prefer MQTT topic: iot/desalinasi/humidity
     */
    async receiveHumidity(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32-HTTP] Received humidity data:', JSON.stringify(data));
            console.log('[ESP32-HTTP] ⚠️  Consider using MQTT instead: iot/desalinasi/humidity');

            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No humidity data received',
                    expected: '{ "RH1": 65.0, "RH2": 70.0, ... }',
                    preferMqtt: 'iot/desalinasi/humidity'
                });
            }

            if (MqttService.getConnectionStatus()) {
                MqttService.publish(MqttService.TOPICS.HUMIDITY, data);
            }

            res.json({
                success: true,
                message: 'Humidity data received (HTTP legacy)',
                received: Object.keys(data).length,
                timestamp: timestamp,
                note: 'Consider switching to MQTT: iot/desalinasi/humidity'
            });

        } catch (error) {
            console.error('[ESP32-HTTP] Error receiving humidity:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive water level data from ESP32 via HTTP (backup/legacy)
     * POST /api/esp32/waterlevel
     * Body: { "WL1": 75 }
     * 
     * NOTE: Prefer MQTT topic: iot/desalinasi/waterlevel
     */
    async receiveWaterLevel(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32-HTTP] Received water level data:', JSON.stringify(data));

            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No water level data received',
                    expected: '{ "WL1": 75 }',
                    preferMqtt: 'iot/desalinasi/waterlevel'
                });
            }

            if (MqttService.getConnectionStatus()) {
                MqttService.publish(MqttService.TOPICS.WATERLEVEL, data);
            }

            res.json({
                success: true,
                message: 'Water level data received (HTTP legacy)',
                received: Object.keys(data).length,
                timestamp: timestamp,
                note: 'Consider switching to MQTT: iot/desalinasi/waterlevel'
            });

        } catch (error) {
            console.error('[ESP32-HTTP] Error receiving water level:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive water weight data from ESP32 via HTTP (backup/legacy)
     * POST /api/esp32/waterweight
     * Body: { "WW1": 500.5 }
     * 
     * NOTE: Prefer MQTT topic: iot/desalinasi/waterweight
     */
    async receiveWaterWeight(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32-HTTP] Received water weight data:', JSON.stringify(data));

            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No water weight data received',
                    expected: '{ "WW1": 500.5 }',
                    preferMqtt: 'iot/desalinasi/waterweight'
                });
            }

            if (MqttService.getConnectionStatus()) {
                MqttService.publish(MqttService.TOPICS.WATERWEIGHT, data);
            }

            res.json({
                success: true,
                message: 'Water weight data received (HTTP legacy)',
                received: Object.keys(data).length,
                timestamp: timestamp,
                note: 'Consider switching to MQTT: iot/desalinasi/waterweight'
            });

        } catch (error) {
            console.error('[ESP32-HTTP] Error receiving water weight:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive valve status from ESP32 via HTTP (backup/legacy)
     * POST /api/esp32/valve
     * Body: { "status": "open" | "closed", "level": 15.5 }
     * 
     * NOTE: Prefer MQTT topic: iot/desalinasi/valve
     */
    async receiveValveStatus(req, res) {
        try {
            const { status, level } = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32-HTTP] Received valve status:', JSON.stringify(req.body));

            if (!status || (status !== 'open' && status !== 'closed')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid valve status',
                    expected: '{ "status": "open" | "closed", "level": 15.5 }',
                    preferMqtt: 'iot/desalinasi/valve'
                });
            }

            if (MqttService.getConnectionStatus()) {
                MqttService.publish(MqttService.TOPICS.VALVE, req.body);
            }

            res.json({
                success: true,
                message: 'Valve status received (HTTP legacy)',
                status: status,
                timestamp: timestamp,
                note: 'Consider switching to MQTT: iot/desalinasi/valve'
            });

        } catch (error) {
            console.error('[ESP32-HTTP] Error receiving valve status:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Get cached real-time data from ESP32
     * GET /api/esp32/realtime
     */
    getRealtimeCache(req, res) {
        const cache = MqttService.getCache();

        // Organize data for frontend consumption
        const response = {
            humidity: {},
            airTemperature: {},
            waterTemperature: {},
            waterLevel: {},
            waterWeight: {},
            valveStatus: cache.valveStatus || { status: 'closed', level: 0 },
            sensorStatus: {
                humidity: {},
                airTemperature: {},
                waterTemperature: {},
                waterLevel: {},
                waterWeight: {}
            },
            lastUpdate: cache.lastUpdate,
            timestamp: new Date().toISOString(),
            mqttConnected: MqttService.getConnectionStatus()
        };

        // Process humidity data
        for (const [sensorId, data] of Object.entries(cache.humidity || {})) {
            response.humidity[sensorId] = data.value;
            response.sensorStatus.humidity[sensorId] = data.status === 'active';
        }

        // Process temperature data (T1-T6, T_X = air, T7-T15 = water)
        for (const [sensorId, data] of Object.entries(cache.temperature || {})) {
            // T_X is from DHT22 extra sensor (air temperature)
            if (sensorId === 'T_X') {
                response.airTemperature[sensorId] = data.value;
                response.sensorStatus.airTemperature[sensorId] = data.status === 'active';
            } else {
                const sensorNum = parseInt(sensorId.substring(1));
                if (sensorNum <= 6) {
                    response.airTemperature[sensorId] = data.value;
                    response.sensorStatus.airTemperature[sensorId] = data.status === 'active';
                } else {
                    response.waterTemperature[sensorId] = data.value;
                    response.sensorStatus.waterTemperature[sensorId] = data.status === 'active';
                }
            }
        }

        // Process water level data
        for (const [sensorId, data] of Object.entries(cache.waterLevel || {})) {
            response.waterLevel[sensorId] = data.value;
            response.sensorStatus.waterLevel[sensorId] = data.status === 'active';
        }

        // Process water weight data
        for (const [sensorId, data] of Object.entries(cache.waterWeight || {})) {
            response.waterWeight[sensorId] = data.value;
            response.sensorStatus.waterWeight[sensorId] = data.status === 'active';
        }

        res.json(response);
    },

    /**
     * Get ESP32 cache status
     * GET /api/esp32/status
     */
    getStatus(req, res) {
        const cache = MqttService.getCache();
        const temperatureCount = Object.keys(cache.temperature || {}).length;
        const humidityCount = Object.keys(cache.humidity || {}).length;
        const waterLevelCount = Object.keys(cache.waterLevel || {}).length;
        const waterWeightCount = Object.keys(cache.waterWeight || {}).length;

        res.json({
            status: 'online',
            protocol: 'MQTT',
            mqttConnected: MqttService.getConnectionStatus(),
            cache: {
                temperatureSensors: temperatureCount,
                humiditySensors: humidityCount,
                waterLevelSensors: waterLevelCount,
                waterWeightSensors: waterWeightCount,
                totalSensors: temperatureCount + humidityCount + waterLevelCount + waterWeightCount
            },
            topics: {
                suhu: MqttService.TOPICS.SUHU,
                kelembapan: MqttService.TOPICS.KELEMBAPAN,
                waterlevel: MqttService.TOPICS.WATERLEVEL,
                waterweight: MqttService.TOPICS.WATERWEIGHT,
                valve: MqttService.TOPICS.VALVE
            },
            lastUpdate: cache.lastUpdate,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Clear the real-time cache
     * DELETE /api/esp32/cache
     */
    clearCache(req, res) {
        MqttService.clearCache();

        res.json({
            success: true,
            message: 'ESP32 cache cleared'
        });
    },

    /**
     * Save cached data to database (manual trigger or used by background logger)
     * POST /api/esp32/save
     */
    async saveCacheToDatabase(req, res) {
        try {
            const cache = MqttService.getCache();
            const savedRecords = [];
            const timestamp = new Date();

            // Save temperature data
            for (const [sensorId, data] of Object.entries(cache.temperature || {})) {
                const record = await DataService.createData({
                    sensor_id: sensorId,
                    sensor_type: 'temperature',
                    value: data.value,
                    unit: '°C',
                    status: data.status || 'active'
                });
                savedRecords.push(record);
            }

            // Save humidity data
            for (const [sensorId, data] of Object.entries(cache.humidity || {})) {
                const record = await DataService.createData({
                    sensor_id: sensorId,
                    sensor_type: 'humidity',
                    value: data.value,
                    unit: '%',
                    status: data.status || 'active'
                });
                savedRecords.push(record);
            }

            // NOTE: Water level is NOT saved to database (realtime only)

            console.log(`[ESP32] Saved ${savedRecords.length} records to database`);

            res.json({
                success: true,
                message: 'Cache saved to database',
                savedCount: savedRecords.length,
                timestamp: timestamp.toISOString()
            });

        } catch (error) {
            console.error('[ESP32] Error saving cache to database:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Export cache for use by BackgroundLogger and Frontend
    getCache() {
        return MqttService.getCache();
    }
};

module.exports = ESP32Controller;
