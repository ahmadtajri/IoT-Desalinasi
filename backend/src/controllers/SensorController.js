const { PrismaClient } = require('@prisma/client');
const DataService = require('../services/DataService');
const ExcelExportService = require('../services/ExcelExportService');

const prisma = new PrismaClient();
const SENSOR_CONFIG_TTL_MS = 5000;
let sensorConfigCache = { map: {}, fetchedAt: 0 };

const getSensorTypeMap = async () => {
    const now = Date.now();
    if (now - sensorConfigCache.fetchedAt < SENSOR_CONFIG_TTL_MS) {
        return sensorConfigCache.map;
    }

    const configs = await prisma.sensorConfig.findMany({
        select: { sensorId: true, sensorType: true, isEnabled: true }
    });

    const map = {};
    for (const cfg of configs) {
        map[cfg.sensorId] = cfg.sensorType;
    }

    sensorConfigCache = { map, fetchedAt: now };
    return map;
};

const SensorController = {
    async getAll(req, res) {
        try {
            const { limit, sensorId, sensorType } = req.query;

            // Admin sees ALL data; regular users see only their own
            const userId = req.user?.role === 'ADMIN' ? null : (req.user?.id || null);

            const prisma = require('../config/prisma');

            // Build base where clause
            const baseWhere = userId ? { userId } : {};

            let whereClause = { ...baseWhere };
            if (sensorId && sensorId !== 'all') whereClause.sensorId = sensorId;
            if (sensorType && sensorType !== 'all') whereClause.sensorType = sensorType;

            const data = await prisma.sensorData.findMany({
                where: whereClause,
                orderBy: { timestamp: 'desc' },
                take: parseInt(limit) || 500,
                include: {
                    user: {
                        select: { username: true }
                    }
                }
            });

            // Flatten user.username into response
            const normalized = data.map(row => ({
                ...row,
                userName: row.user?.username || null,
                user: undefined
            }));

            res.json(normalized);
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

    async deleteAll(req, res) {
        try {
            // Users can only delete their own data; admin deletes all
            const userId = req.user?.role === 'ADMIN' ? null : (req.user?.id || null);
            await DataService.deleteAllData(userId);
            res.json({ message: 'Data deleted successfully' });
        } catch (error) {
            console.error('Error in deleteAll:', error);
            res.status(500).json({ error: error.message });
        }
    },

    async deleteByFilter(req, res) {
        try {
            const { sensorTypes, sensorIds } = req.body;

            // Validation: at least one filter must be provided
            if ((!sensorTypes || sensorTypes.length === 0) && (!sensorIds || sensorIds.length === 0)) {
                return res.status(400).json({
                    error: 'At least one filter (sensorTypes or sensorIds) must be provided'
                });
            }

            // Users can only delete their own data; admin deletes across all users
            const userId = req.user?.role === 'ADMIN' ? null : (req.user?.id || null);

            console.log('deleteByFilter called with:', { sensorTypes, sensorIds, userId });

            // Build where clause for Prisma
            const whereClause = {};
            const orConditions = [];

            // Add sensorType conditions
            if (sensorTypes && sensorTypes.length > 0) {
                sensorTypes.forEach(type => {
                    orConditions.push({ sensorType: type });
                });
            }

            // Add sensorId conditions
            if (sensorIds && sensorIds.length > 0) {
                sensorIds.forEach(id => {
                    orConditions.push({ sensorId: id });
                });
            }

            // Use OR condition if multiple filters
            if (orConditions.length > 0) {
                whereClause.OR = orConditions;
            }

            const result = await DataService.deleteByFilter(whereClause, userId);

            res.json({
                success: true,
                message: `Successfully deleted ${result.count} records`,
                deletedCount: result.count
            });
        } catch (error) {
            console.error('Error in deleteByFilter:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    async deleteById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'Missing record ID' });
            }
            await DataService.deleteById(id);
            res.json({ success: true, message: `Record ${id} deleted successfully` });
        } catch (error) {
            console.error('Error in deleteById:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Record not found' });
            }
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
            const sensorTypeMap = await getSensorTypeMap();

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

            // Process humidity data from ESP32 cache (only if configured as humidity)
            for (const [sensorId, data] of Object.entries(cache.humidity || {})) {
                if (sensorTypeMap[sensorId] !== 'humidity') continue;
                realtimeData.humidity[sensorId] = data.status === 'active' ? data.value : null;
                sensorStatus.humidity[sensorId] = data.status === 'active';
            }

            // Process temperature data (categorize by admin-configured sensorType)
            for (const [sensorId, data] of Object.entries(cache.temperature || {})) {
                const configuredType = sensorTypeMap[sensorId];
                if (configuredType === 'air_temperature') {
                    realtimeData.airTemperature[sensorId] = data.status === 'active' ? data.value : null;
                    sensorStatus.airTemperature[sensorId] = data.status === 'active';
                } else if (configuredType === 'water_temperature') {
                    realtimeData.waterTemperature[sensorId] = data.status === 'active' ? data.value : null;
                    sensorStatus.waterTemperature[sensorId] = data.status === 'active';
                }
            }

            // Process water level data (only if configured as water_level)
            for (const [sensorId, data] of Object.entries(cache.waterLevel || {})) {
                if (sensorTypeMap[sensorId] !== 'water_level') continue;
                realtimeData.waterLevel[sensorId] = data.status === 'active' ? data.value : null;
                sensorStatus.waterLevel[sensorId] = data.status === 'active';
            }

            // Process generic sensors cache (from esp32/sensors topic)
            // Categorize based on admin-configured sensorType, skip if already added from specific caches
            for (const [sensorId, data] of Object.entries(cache.sensors || {})) {
                const configuredType = sensorTypeMap[sensorId];
                if (!configuredType) continue; // unconfigured sensor, skip

                if (configuredType === 'humidity' && !(sensorId in realtimeData.humidity)) {
                    realtimeData.humidity[sensorId] = data.status === 'active' ? data.value : null;
                    sensorStatus.humidity[sensorId] = data.status === 'active';
                } else if (configuredType === 'air_temperature' && !(sensorId in realtimeData.airTemperature)) {
                    realtimeData.airTemperature[sensorId] = data.status === 'active' ? data.value : null;
                    sensorStatus.airTemperature[sensorId] = data.status === 'active';
                } else if (configuredType === 'water_temperature' && !(sensorId in realtimeData.waterTemperature)) {
                    realtimeData.waterTemperature[sensorId] = data.status === 'active' ? data.value : null;
                    sensorStatus.waterTemperature[sensorId] = data.status === 'active';
                } else if (configuredType === 'water_level' && !(sensorId in realtimeData.waterLevel)) {
                    realtimeData.waterLevel[sensorId] = data.status === 'active' ? data.value : null;
                    sensorStatus.waterLevel[sensorId] = data.status === 'active';
                }
            }

            res.json({
                realtimeData,
                sensorStatus,
                pumpStatus: cache.valveStatus?.status === 'open', // Valve open = pump on
                valveStatus: cache.valveStatus || null, // Send full valve status object
                waterWeight: cache.waterWeight?.WW1?.status === 'active' ? (cache.waterWeight.WW1.value ?? null) : null,
                lastUpdate: cache.lastUpdate,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error in getRealtimeData:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * GET /api/sensors/export-excel
     * Export sensor data as multi-sheet Excel (.xlsx) with charts
     * Query params: limit, sensorTypes (comma-separated)
     */
    async exportExcel(req, res) {
        try {
            const { limit, sensorTypes } = req.query;

            // Admin sees ALL data; regular users see only their own
            const userId = req.user?.role === 'ADMIN' ? null : (req.user?.id || null);

            const prisma = require('../config/prisma');

            // Build where clause
            const whereClause = userId ? { userId } : {};

            // Optional sensorType filter
            if (sensorTypes) {
                const types = sensorTypes.split(',').map(t => t.trim()).filter(Boolean);
                if (types.length > 0) {
                    whereClause.sensorType = { in: types };
                }
            }

            const data = await prisma.sensorData.findMany({
                where: whereClause,
                orderBy: { timestamp: 'asc' },
                take: parseInt(limit) || 5000 // Higher limit for export
            });

            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Tidak ada data sensor untuk di-export'
                });
            }

            // Generate Excel buffer
            const dateStr = new Date().toISOString().slice(0, 10);
            const username = req.user?.username || 'user';
            const title = `Laporan Visualisasi Desalinasi - ${username} - ${dateStr}`;

            const excelBuffer = await ExcelExportService.generateExcel(data, title);

            // Send as downloadable .xlsx
            const fileName = `Laporan_Desalinasi_${username}_${dateStr}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', excelBuffer.length);
            res.send(Buffer.from(excelBuffer));

        } catch (error) {
            console.error('Error in exportExcel:', error);
            res.status(500).json({
                success: false,
                error: 'Gagal generate file Excel: ' + error.message
            });
        }
    }
};

module.exports = SensorController;
