/**
 * ESP32 Controller
 * Handles bulk sensor data from ESP32 devices
 * 
 * ESP32 sends data in format: {"T1": 25.5, "T2": 26.0, ...} or {"RH1": 65.0, "RH2": 70.0, ...}
 * This controller converts that to individual sensor records
 */

const DataService = require('../services/DataService');

// In-memory cache for real-time data (not persisted to DB immediately)
const realtimeCache = {
    temperature: {},  // { "T1": { value: 25.5, timestamp: "..." }, ... }
    humidity: {},     // { "RH1": { value: 65.0, timestamp: "..." }, ... }
    waterLevel: {},   // { "WL1": { value: 75, timestamp: "..." }, ... }
    waterWeight: {},  // { "WW1": { value: 500.5, timestamp: "..." }, ... }
    valveStatus: { status: 'closed', level: 0, timestamp: null }, // Valve control status
    lastUpdate: null
};

const ESP32Controller = {
    /**
     * Receive temperature data from ESP32
     * POST /api/esp32/temperature
     * Body: { "T1": 25.5, "T2": 26.0, "T3": 27.5, ... }
     */
    async receiveTemperature(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32] Received temperature data:', JSON.stringify(data));

            // Validate that we have data
            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No temperature data received',
                    expected: '{ "T1": 25.5, "T2": 26.0, ... }'
                });
            }

            const validSensors = [];
            const invalidSensors = [];

            // Process each sensor reading
            for (const [sensorId, value] of Object.entries(data)) {
                // Validate sensor ID format (T1-T15)
                if (!/^T([1-9]|1[0-5])$/.test(sensorId)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid sensor ID format' });
                    continue;
                }

                // Validate value
                if (typeof value !== 'number' || isNaN(value)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid value (must be number)' });
                    continue;
                }

                // Validate temperature range (-40°C to 80°C for DHT22)
                if (value < -40 || value > 80) {
                    invalidSensors.push({ sensorId, value, reason: 'Value out of range (-40 to 80°C)' });
                    continue;
                }

                // Update real-time cache
                // Update real-time cache
                realtimeCache.temperature[sensorId] = {
                    value: value,
                    timestamp: timestamp,
                    receivedAt: Date.now(),
                    status: 'active'
                };

                validSensors.push({ sensorId, value });
            }

            // Update last update timestamp
            realtimeCache.lastUpdate = timestamp;

            console.log(`[ESP32] Temperature: ${validSensors.length} valid, ${invalidSensors.length} invalid`);

            res.json({
                success: true,
                message: 'Temperature data received',
                received: validSensors.length,
                cached: true,
                timestamp: timestamp,
                sensors: validSensors,
                invalid: invalidSensors.length > 0 ? invalidSensors : undefined
            });

        } catch (error) {
            console.error('[ESP32] Error receiving temperature:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive humidity data from ESP32
     * POST /api/esp32/humidity
     * Body: { "RH1": 65.0, "RH2": 70.0, "RH3": 68.5, ... }
     */
    async receiveHumidity(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32] Received humidity data:', JSON.stringify(data));

            // Validate that we have data
            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No humidity data received',
                    expected: '{ "RH1": 65.0, "RH2": 70.0, ... }'
                });
            }

            const validSensors = [];
            const invalidSensors = [];

            // Process each sensor reading
            for (const [sensorId, value] of Object.entries(data)) {
                // Validate sensor ID format (RH1-RH7)
                if (!/^RH[1-7]$/.test(sensorId)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid sensor ID format' });
                    continue;
                }

                // Validate value
                if (typeof value !== 'number' || isNaN(value)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid value (must be number)' });
                    continue;
                }

                // Validate humidity range (0-100%)
                if (value < 0 || value > 100) {
                    invalidSensors.push({ sensorId, value, reason: 'Value out of range (0-100%)' });
                    continue;
                }

                // Update real-time cache
                // Update real-time cache
                realtimeCache.humidity[sensorId] = {
                    value: value,
                    timestamp: timestamp,
                    receivedAt: Date.now(),
                    status: 'active'
                };

                validSensors.push({ sensorId, value });
            }

            // Update last update timestamp
            realtimeCache.lastUpdate = timestamp;

            console.log(`[ESP32] Humidity: ${validSensors.length} valid, ${invalidSensors.length} invalid`);

            res.json({
                success: true,
                message: 'Humidity data received',
                received: validSensors.length,
                cached: true,
                timestamp: timestamp,
                sensors: validSensors,
                invalid: invalidSensors.length > 0 ? invalidSensors : undefined
            });

        } catch (error) {
            console.error('[ESP32] Error receiving humidity:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive water level data from ESP32
     * POST /api/esp32/waterlevel
     * Body: { "WL1": 75 }
     */
    async receiveWaterLevel(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32] Received water level data:', JSON.stringify(data));

            // Validate that we have data
            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No water level data received',
                    expected: '{ "WL1": 75 }'
                });
            }

            const validSensors = [];
            const invalidSensors = [];

            // Process each sensor reading
            for (const [sensorId, value] of Object.entries(data)) {
                // Validate sensor ID format (WL1)
                if (!/^WL[1-9]$/.test(sensorId)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid sensor ID format' });
                    continue;
                }

                // Validate value
                if (typeof value !== 'number' || isNaN(value)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid value (must be number)' });
                    continue;
                }

                // Validate water level range (0-100%)
                if (value < 0 || value > 100) {
                    invalidSensors.push({ sensorId, value, reason: 'Value out of range (0-100%)' });
                    continue;
                }

                // Update real-time cache
                // Update real-time cache
                realtimeCache.waterLevel[sensorId] = {
                    value: value,
                    timestamp: timestamp,
                    receivedAt: Date.now(),
                    status: 'active'
                };

                validSensors.push({ sensorId, value });
            }

            // Update last update timestamp
            realtimeCache.lastUpdate = timestamp;

            console.log(`[ESP32] Water Level: ${validSensors.length} valid, ${invalidSensors.length} invalid`);

            res.json({
                success: true,
                message: 'Water level data received',
                received: validSensors.length,
                cached: true,
                timestamp: timestamp,
                sensors: validSensors,
                invalid: invalidSensors.length > 0 ? invalidSensors : undefined
            });

        } catch (error) {
            console.error('[ESP32] Error receiving water level:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive water weight data from ESP32 (Load Cell)
     * POST /api/esp32/waterweight
     * Body: { "WW1": 500.5 }
     */
    async receiveWaterWeight(req, res) {
        try {
            const data = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32] Received water weight data:', JSON.stringify(data));

            // Validate that we have data
            if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No water weight data received',
                    expected: '{ "WW1": 500.5 }'
                });
            }

            const validSensors = [];
            const invalidSensors = [];

            // Process each sensor reading
            for (const [sensorId, value] of Object.entries(data)) {
                // Validate sensor ID format (WW1)
                if (!/^WW[1-9]$/.test(sensorId)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid sensor ID format' });
                    continue;
                }

                // Validate value
                if (typeof value !== 'number' || isNaN(value)) {
                    invalidSensors.push({ sensorId, reason: 'Invalid value (must be number)' });
                    continue;
                }

                // Update real-time cache
                realtimeCache.waterWeight[sensorId] = {
                    value: value,
                    timestamp: timestamp,
                    receivedAt: Date.now(),
                    status: 'active'
                };

                validSensors.push({ sensorId, value });
            }

            // Update last update timestamp
            realtimeCache.lastUpdate = timestamp;

            console.log(`[ESP32] Water Weight: ${validSensors.length} valid, ${invalidSensors.length} invalid`);

            res.json({
                success: true,
                message: 'Water weight data received',
                received: validSensors.length,
                cached: true,
                timestamp: timestamp,
                sensors: validSensors,
                invalid: invalidSensors.length > 0 ? invalidSensors : undefined
            });

        } catch (error) {
            console.error('[ESP32] Error receiving water weight:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Receive valve status from ESP32
     * POST /api/esp32/valve
     * Body: { "status": "open" | "closed", "level": 15.5 }
     */
    async receiveValveStatus(req, res) {
        try {
            const { status, level } = req.body;
            const timestamp = new Date().toISOString();

            console.log('[ESP32] Received valve status:', JSON.stringify(req.body));

            // Validate data
            if (!status || (status !== 'open' && status !== 'closed')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid valve status',
                    expected: '{ "status": "open" | "closed", "level": 15.5 }'
                });
            }

            // Update valve status in cache
            realtimeCache.valveStatus = {
                status: status,
                level: level || 0,
                timestamp: timestamp,
                receivedAt: Date.now()
            };

            realtimeCache.lastUpdate = timestamp;

            console.log(`[ESP32] Valve status updated: ${status.toUpperCase()}`);

            res.json({
                success: true,
                message: 'Valve status received',
                status: status,
                timestamp: timestamp
            });

        } catch (error) {
            console.error('[ESP32] Error receiving valve status:', error);
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
        // Organize data for frontend consumption
        const response = {
            humidity: {},
            airTemperature: {},
            waterTemperature: {},
            waterLevel: {},
            sensorStatus: {
                humidity: {},
                airTemperature: {},
                waterTemperature: {},
                airTemperature: {},
                waterTemperature: {},
                waterLevel: {},
                waterWeight: {}
            },
            lastUpdate: realtimeCache.lastUpdate,
            timestamp: new Date().toISOString()
        };

        // Process humidity data
        for (const [sensorId, data] of Object.entries(realtimeCache.humidity)) {
            response.humidity[sensorId] = data.value;
            response.sensorStatus.humidity[sensorId] = data.status === 'active';
        }

        // Process temperature data (T1-T7 = air, T8-T15 = water)
        for (const [sensorId, data] of Object.entries(realtimeCache.temperature)) {
            const sensorNum = parseInt(sensorId.substring(1));
            if (sensorNum <= 7) {
                response.airTemperature[sensorId] = data.value;
                response.sensorStatus.airTemperature[sensorId] = data.status === 'active';
            } else {
                response.waterTemperature[sensorId] = data.value;
                response.sensorStatus.waterTemperature[sensorId] = data.status === 'active';
            }
        }

        // Process water level data
        for (const [sensorId, data] of Object.entries(realtimeCache.waterLevel)) {
            response.waterLevel[sensorId] = data.value;
            response.sensorStatus.waterLevel[sensorId] = data.status === 'active';
        }

        // Process water weight data
        for (const [sensorId, data] of Object.entries(realtimeCache.waterWeight)) {
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
        const temperatureCount = Object.keys(realtimeCache.temperature).length;
        const humidityCount = Object.keys(realtimeCache.humidity).length;
        const waterLevelCount = Object.keys(realtimeCache.waterLevel).length;

        res.json({
            status: 'online',
            cache: {
                temperatureSensors: temperatureCount,
                humiditySensors: humidityCount,
                waterLevelSensors: waterLevelCount,
                waterWeightSensors: Object.keys(realtimeCache.waterWeight).length,
                totalSensors: temperatureCount + humidityCount + waterLevelCount + Object.keys(realtimeCache.waterWeight).length
            },
            lastUpdate: realtimeCache.lastUpdate,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    },

    /**
     * Clear the real-time cache
     * DELETE /api/esp32/cache
     */
    clearCache(req, res) {
        realtimeCache.temperature = {};
        realtimeCache.humidity = {};
        realtimeCache.waterLevel = {};
        realtimeCache.waterWeight = {};
        realtimeCache.lastUpdate = null;

        console.log('[ESP32] Cache cleared');

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
            const savedRecords = [];
            const timestamp = new Date();

            // Save temperature data
            for (const [sensorId, data] of Object.entries(realtimeCache.temperature)) {
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
            for (const [sensorId, data] of Object.entries(realtimeCache.humidity)) {
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

    // Export cache for use by BackgroundLogger
    // Export cache for use by BackgroundLogger and Frontend
    getCache() {
        const CACHE_TTL = 30000; // 30 seconds
        const now = Date.now();
        const processedCache = JSON.parse(JSON.stringify(realtimeCache));

        // Helper to check expiry
        const checkExpiry = (category) => {
            if (!processedCache[category]) return;
            for (const sensorId in processedCache[category]) {
                const sensor = processedCache[category][sensorId];
                // If data is older than TTL, mark as inactive
                if (sensor.receivedAt && (now - sensor.receivedAt > CACHE_TTL)) {
                    sensor.status = 'inactive';
                    // Optional: You can choose to nullify value if strictly needed
                    // sensor.value = null; 
                }
            }
        };

        checkExpiry('humidity');
        checkExpiry('temperature');
        checkExpiry('waterLevel');
        checkExpiry('waterWeight');

        return processedCache;
    }
};

module.exports = ESP32Controller;
