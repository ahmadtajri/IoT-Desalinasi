// Data Service - Using Prisma ORM
const prisma = require('../config/prisma');

const DataService = {
    /**
     * Get all sensor data with optional user filter
     */
    async getAllData(limit = 100, userId = null) {
        console.log('[DataService] getAllData called with limit:', limit, '| userId:', userId);

        const whereClause = userId ? { userId } : {};

        try {
            return await prisma.sensorData.findMany({
                where: whereClause,
                orderBy: { timestamp: 'desc' },
                take: parseInt(limit),
            });
        } catch (error) {
            console.error('[DataService] getAllData error:', error.message);
            throw error;
        }
    },

    /**
     * Get data by sensor ID
     */
    async getDataBySensorId(sensorId, limit = 100, userId = null) {
        console.log('[DataService] getDataBySensorId called:', sensorId, '| userId:', userId);

        const whereClause = { sensorId };
        if (userId) whereClause.userId = userId;

        return await prisma.sensorData.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
        });
    },

    /**
     * Get data by sensor type
     */
    async getDataBySensorType(sensorType, limit = 100, userId = null) {
        console.log('[DataService] getDataBySensorType called:', sensorType, '| userId:', userId);

        const whereClause = { sensorType };
        if (userId) whereClause.userId = userId;

        return await prisma.sensorData.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit),
        });
    },

    /**
     * Create new sensor data
     */
    async createData(sensorData, userId = null) {
        // console.log('[DataService] createData called:', sensorData.sensor_id || sensorData.sensorId);

        const dataToCreate = {
            sensorId: sensorData.sensor_id || sensorData.sensorId,
            sensorType: sensorData.sensor_type || sensorData.sensorType,
            value: parseFloat(sensorData.value),
            status: sensorData.status || 'active',
            intervalSeconds: sensorData.interval || sensorData.intervalSeconds || null,
            userId: userId,
        };

        // If explicit timestamp is provided (from BackgroundLogger cycle), use it
        // This ensures all records in one cycle share the same timestamp
        if (sensorData.timestamp) {
            dataToCreate.timestamp = sensorData.timestamp;
        }
        // Otherwise, Prisma will use the database default (CURRENT_TIMESTAMP)

        return await prisma.sensorData.create({
            data: dataToCreate,
        });
    },

    /**\n     * Delete all sensor data (with optional user filter)\n     */
    async deleteAllData(userId = null) {
        console.log('[DataService] deleteAllData called | userId:', userId);

        const whereClause = userId ? { userId } : {};

        return await prisma.sensorData.deleteMany({
            where: whereClause,
        });
    },

    /**
     * Delete data by filter (sensorTypes or sensorIds)
     */
    async deleteByFilter(whereClause, userId = null) {
        console.log('[DataService] deleteByFilter called with whereClause:', JSON.stringify(whereClause), '| userId:', userId);

        // Add userId filter if provided (for multi-tenant support)
        if (userId) {
            whereClause.userId = userId;
        }

        try {
            const result = await prisma.sensorData.deleteMany({
                where: whereClause,
            });
            console.log(`[DataService] Successfully deleted ${result.count} records`);
            return result;
        } catch (error) {
            console.error('[DataService] Error in deleteByFilter:', error);
            throw error;
        }
    },

    /**
     * Get statistics
     */
    async getStats(userId = null) {
        const whereClause = userId ? { userId } : {};

        try {
            const totalRecords = await prisma.sensorData.count({
                where: whereClause,
            });

            const humidityCount = await prisma.sensorData.count({
                where: { ...whereClause, sensorType: 'humidity' },
            });

            const temperatureCount = await prisma.sensorData.count({
                where: { ...whereClause, sensorType: 'temperature' },
            });

            const airTemperatureCount = await prisma.sensorData.count({
                where: { ...whereClause, sensorType: 'air_temperature' },
            });

            const waterTemperatureCount = await prisma.sensorData.count({
                where: { ...whereClause, sensorType: 'water_temperature' },
            });

            return {
                totalRecords,
                humidityCount,
                temperatureCount,
                airTemperatureCount,
                waterTemperatureCount,
            };
        } catch (error) {
            console.error('[DataService] Error getting stats:', error);
            // Return empty stats on error
            return {
                totalRecords: 0,
                humidityCount: 0,
                temperatureCount: 0
            };
        }
    },

    /**
     * Get database status
     */
    async getDatabaseStatus(userId = null) {
        console.log('[DataService] getDatabaseStatus called | userId:', userId);

        try {
            const whereClause = userId ? { userId } : {};
            const totalRecords = await prisma.sensorData.count({
                where: whereClause,
            });

            const warningLimit = 100000;
            const criticalLimit = 500000;

            let status = 'OK';
            let message = 'Database dalam kondisi normal';

            if (totalRecords >= criticalLimit) {
                status = 'CRITICAL';
                message = `Database hampir penuh! ${totalRecords} records. Segera hapus data lama.`;
            } else if (totalRecords >= warningLimit) {
                status = 'WARNING';
                message = `Perhatian: Database mencapai ${totalRecords} records. Pertimbangkan untuk menghapus data lama.`;
            }

            // Get user count and admin count
            const userCount = await prisma.user.count({ where: { role: 'USER' } });
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });

            return {
                total_records: totalRecords,
                table_size_mb: 0,
                database_size_mb: 0,
                status: status,
                message: message,
                warning_threshold: warningLimit,
                critical_threshold: criticalLimit,
                using_prisma: true,
                users: {
                    total: userCount + adminCount,
                    admins: adminCount,
                    users: userCount,
                },
            };
        } catch (error) {
            console.error('[DataService] Error in getDatabaseStatus:', error);
            throw error;
        }
    },

    /**
     * Delete single record by ID
     */
    async deleteById(id) {
        console.log('[DataService] deleteById called with id:', id);
        try {
            return await prisma.sensorData.delete({
                where: { id: parseInt(id) },
            });
        } catch (error) {
            console.error('[DataService] deleteById error:', error.message);
            throw error;
        }
    },

    /**
     * Bulk create sensor data (for logger)
     */
    async bulkCreate(dataArray, userId = null, intervalSeconds = null) {
        console.log('[DataService] bulkCreate called with', dataArray.length, 'records | userId:', userId);

        const formattedData = dataArray.map((item) => ({
            sensorId: item.sensor_id || item.sensorId,
            sensorType: item.sensor_type || item.sensorType,
            value: parseFloat(item.value),
            status: item.status || 'active',
            intervalSeconds: intervalSeconds || item.interval || item.intervalSeconds || null,
            userId: userId,
        }));

        return await prisma.sensorData.createMany({
            data: formattedData,
        });
    },
};

module.exports = DataService;
