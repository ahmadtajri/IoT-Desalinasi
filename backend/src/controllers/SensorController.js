const DataService = require('../services/DataService');

const SensorController = {
    async getAll(req, res) {
        try {
            const { limit, sensorId, sensorType, startDate, endDate } = req.query;

            let data;
            if (sensorId && sensorId !== 'all') {
                data = await DataService.getDataBySensorId(sensorId, limit || 100);
            } else if (sensorType && sensorType !== 'all') {
                data = await DataService.getDataBySensorType(sensorType, limit || 100);
            } else if (startDate && endDate) {
                data = await DataService.getDataByDateRange(new Date(startDate), new Date(endDate));
            } else {
                data = await DataService.getAllData(limit || 100);
            }

            res.json(data);
        } catch (error) {
            console.error('Error in getAll:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async create(req, res) {
        try {
            const { sensor_id, sensor_type, value, unit, status, interval } = req.body;

            // Validation
            if (!sensor_id) {
                return res.status(400).json({ error: 'Missing sensor_id' });
            }
            if (!sensor_type) {
                return res.status(400).json({ error: 'Missing sensor_type' });
            }
            if (value === undefined || value === null) {
                return res.status(400).json({ error: 'Missing value' });
            }

            const newData = await DataService.createData({
                sensor_id,
                sensor_type,
                value: parseFloat(value),
                unit: unit || (sensor_type === 'temperature' ? '°C' : '%'),
                status: status || 'active',
                interval: parseInt(interval) || null
            });
            res.status(201).json(newData);
        } catch (error) {
            console.error('Error in create:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const deleted = await DataService.deleteData(id);
            if (deleted) {
                res.json({ message: 'Data deleted successfully' });
            } else {
                res.status(404).json({ error: 'Data not found' });
            }
        } catch (error) {
            console.error('Error in delete:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async deleteAll(req, res) {
        try {
            await DataService.deleteAllData();
            res.json({ message: 'All data deleted successfully' });
        } catch (error) {
            console.error('Error in deleteAll:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async deleteBySensorId(req, res) {
        try {
            const { sensorId } = req.params;
            console.log('deleteBySensorId called with sensorId:', sensorId);

            if (!sensorId) {
                return res.status(400).json({
                    error: 'Invalid sensor ID',
                    received: sensorId
                });
            }

            console.log('Attempting to delete data for sensor:', sensorId);
            const deleted = await DataService.deleteDataBySensorId(sensorId);
            console.log('Delete operation completed. Rows affected:', deleted);

            res.json({
                success: true,
                message: `All data for sensor ${sensorId} deleted successfully`,
                deletedCount: deleted
            });
        } catch (error) {
            console.error('Error in deleteBySensorId:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: error.stack
            });
        }
    },

    async deleteBySensorType(req, res) {
        try {
            const { sensorType } = req.params;
            console.log('deleteBySensorType called with type:', sensorType);

            const validTypes = ['humidity', 'temperature'];
            if (!validTypes.includes(sensorType)) {
                return res.status(400).json({
                    error: 'Invalid sensor type. Must be: humidity or temperature',
                    received: sensorType
                });
            }

            const deleted = await DataService.deleteDataBySensorType(sensorType);
            res.json({
                success: true,
                message: `All data for sensor type ${sensorType} deleted successfully`,
                deletedCount: deleted
            });
        } catch (error) {
            console.error('Error in deleteBySensorType:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    async deleteByInterval(req, res) {
        try {
            const { interval } = req.params;
            const intervalSeconds = parseInt(interval);

            if (isNaN(intervalSeconds) || intervalSeconds < 0) {
                return res.status(400).json({ error: 'Invalid interval' });
            }

            const deleted = await DataService.deleteDataByInterval(intervalSeconds);
            res.json({
                success: true,
                message: `Data with interval ${intervalSeconds}s deleted successfully`,
                deletedCount: deleted
            });
        } catch (error) {
            console.error('Error in deleteByInterval:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getDatabaseStatus(req, res) {
        try {
            const status = await DataService.getDatabaseStatus();
            res.json(status);
        } catch (error) {
            console.error('Error in getDatabaseStatus:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async getRealtimeData(req, res) {
        try {
            // Get data from ESP32 cache (real-time data from ESP32 devices)
            const ESP32Controller = require('./ESP32Controller');
            const cache = ESP32Controller.getCache();

            // Organize data for frontend consumption
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

            // Process humidity data from ESP32 cache
            for (const [sensorId, data] of Object.entries(cache.humidity || {})) {
                realtimeData.humidity[sensorId] = data.value;
                sensorStatus.humidity[sensorId] = data.status === 'active';
            }

            // Process temperature data (T1-T7 = air, T8-T15 = water)
            for (const [sensorId, data] of Object.entries(cache.temperature || {})) {
                const sensorNum = parseInt(sensorId.substring(1));
                if (sensorNum <= 7) {
                    realtimeData.airTemperature[sensorId] = data.value;
                    sensorStatus.airTemperature[sensorId] = data.status === 'active';
                } else {
                    realtimeData.waterTemperature[sensorId] = data.value;
                    sensorStatus.waterTemperature[sensorId] = data.status === 'active';
                }
            }

            // Process water level data
            for (const [sensorId, data] of Object.entries(cache.waterLevel || {})) {
                realtimeData.waterLevel[sensorId] = data.value;
                sensorStatus.waterLevel[sensorId] = data.status === 'active';
            }

            res.json({
                realtimeData,
                sensorStatus,
                pumpStatus: cache.valveStatus?.status === 'open', // Valve open = pump on
                valveStatus: cache.valveStatus?.status || 'closed', // Send valve status
                waterWeight: cache.waterWeight?.WW1?.value ?? null, // Get WW1 value if available
                lastUpdate: cache.lastUpdate,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getRealtimeData:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = SensorController;
