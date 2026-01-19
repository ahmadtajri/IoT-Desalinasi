const express = require('express');
const router = express.Router();
const SensorController = require('../controllers/SensorController');
const LoggerController = require('../controllers/LoggerController');
const ESP32Controller = require('../controllers/ESP32Controller');

// Welcome endpoint - API info
router.get('/', (req, res) => {
    res.json({
        message: 'ESP32 IoT Desalinasi Data Logger API',
        version: '2.2',
        description: 'API for managing sensor data (RH1-RH7 Humidity, T1-T15 Temperature)',
        endpoints: {
            'GET /api/': 'API information',
            'GET /api/stats': 'Data statistics',
            'GET /api/database/status': 'Get database status and warnings',
            'GET /api/sensors': 'Get all sensor data',
            'GET /api/sensors?sensorId=RH1': 'Get data by sensor ID (RH1-RH7, T1-T15, WL1)',
            'GET /api/sensors?sensorType=humidity': 'Get data by sensor type (humidity, temperature)',
            'GET /api/sensors?limit=50': 'Get limited data',
            'GET /api/sensors?startDate=...&endDate=...': 'Get data by date range',
            'POST /api/sensors': 'Create new sensor data',
            'DELETE /api/sensors/:id': 'Delete single sensor data by record ID',
            'DELETE /api/sensors': 'Delete all sensor data',
            'DELETE /api/sensors/sensor/:sensorId': 'Delete all data from specific sensor (RH1, T2, etc)',
            'DELETE /api/sensors/type/:sensorType': 'Delete all data by sensor type (humidity, temperature)',
            'DELETE /api/sensors/interval/:interval': 'Delete data by logging interval (5, 30, 60)',
            'GET /api/logger/status': 'Get background logger status',
            'POST /api/logger/start': 'Start background data logger',
            'POST /api/logger/stop': 'Stop background data logger',
            'POST /api/logger/config': 'Configure logger settings',
            'POST /api/esp32/temperature': 'ESP32: Send bulk temperature data {"T1": 25.5, ...}',
            'POST /api/esp32/humidity': 'ESP32: Send bulk humidity data {"RH1": 65.0, ...}',
            'POST /api/esp32/waterlevel': 'ESP32: Send water level data {"WL1": 75}',
            'GET /api/esp32/realtime': 'Get cached real-time sensor data from ESP32',
            'GET /api/esp32/status': 'Get ESP32 connection status',
            'DELETE /api/esp32/cache': 'Clear ESP32 real-time cache',
            'POST /api/esp32/save': 'Save cached ESP32 data to database'
        },
        sensorConfig: {
            humidity: 'RH1-RH7 (7 sensors)',
            temperature: 'T1-T15 (15 sensors)',
            waterLevel: 'WL1 (realtime only, not saved to database)',
            total: '23 sensors'
        },
        example: {
            'GET': 'http://localhost:3000/api/sensors?sensorType=humidity',
            'POST': {
                url: 'http://localhost:3000/api/sensors',
                body: {
                    sensor_id: 'RH1',
                    sensor_type: 'humidity',
                    value: 65.5,
                    unit: '%',
                    status: 'active',
                    interval: 5
                }
            }
        }
    });
});

// Stats endpoint
router.get('/stats', async (req, res) => {
    const DataService = require('../services/DataService');
    const stats = await DataService.getStats();
    res.json({
        ...stats,
        message: 'Sensor data statistics'
    });
});

// Database status endpoint
router.get('/database/status', SensorController.getDatabaseStatus);

// Sensor endpoints
// IMPORTANT: Order matters! More specific routes must come BEFORE general routes
router.get('/sensors/realtime', SensorController.getRealtimeData);
router.get('/sensors', SensorController.getAll);
router.post('/sensors', SensorController.create);

// Specific DELETE routes first
router.delete('/sensors/sensor/:sensorId', SensorController.deleteBySensorId);
router.delete('/sensors/type/:sensorType', SensorController.deleteBySensorType);
router.delete('/sensors/interval/:interval', SensorController.deleteByInterval);
router.delete('/sensors/:id', SensorController.delete);

// General DELETE route last
router.delete('/sensors', SensorController.deleteAll);

// Logger endpoints
router.get('/logger/status', LoggerController.getStatus);
router.post('/logger/start', LoggerController.start);
router.post('/logger/stop', LoggerController.stop);
router.post('/logger/config', LoggerController.config);

// ESP32 endpoints - Bulk sensor data from ESP32 devices
router.post('/esp32/temperature', ESP32Controller.receiveTemperature);
router.post('/esp32/humidity', ESP32Controller.receiveHumidity);
router.post('/esp32/waterlevel', ESP32Controller.receiveWaterLevel);
router.post('/esp32/waterweight', ESP32Controller.receiveWaterWeight);
router.post('/esp32/valve', ESP32Controller.receiveValveStatus);
router.get('/esp32/realtime', ESP32Controller.getRealtimeCache);
router.get('/esp32/status', ESP32Controller.getStatus);
router.delete('/esp32/cache', ESP32Controller.clearCache);
router.post('/esp32/save', ESP32Controller.saveCacheToDatabase);

module.exports = router;
