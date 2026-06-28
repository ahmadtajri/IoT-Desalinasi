const LoggerManager = require('../services/BackgroundLogger');

const LoggerController = {
    /**
     * Get logger status for the authenticated user
     */
    getStatus: (req, res) => {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const status = LoggerManager.getStatusForUser(userId);
        res.json(status);
    },

    /**
     * Get all loggers status (admin only)
     */
    getAllStatus: (req, res) => {
        const allStatus = LoggerManager.getAllStatus();
        res.json({ success: true, ...allStatus });
    },

    /**
     * Start logger for the authenticated user
     */
    start: async (req, res) => {
        const userId = req.user?.id;
        const username = req.user?.username;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { humidity, airTemperature, waterTemperature, temperature, interval } = req.body;

        // Configure sensor categories
        const tempFallback = temperature !== undefined ? temperature : 'all';
        const sensorConfig = {
            humidity: humidity !== undefined ? humidity : 'all',
            airTemperature: airTemperature !== undefined ? airTemperature : tempFallback,
            waterTemperature: waterTemperature !== undefined ? waterTemperature : tempFallback
        };

        // Use interval from request body, or user's active interval from DB, or default
        const intervalMs = interval || null;

        try {
            const result = await LoggerManager.startForUser(userId, username, intervalMs, sensorConfig);

            if (result && !result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.message,
                    status: LoggerManager.getStatusForUser(userId)
                });
            }

            res.json({
                success: true,
                message: `Logger started untuk ${username}`,
                status: LoggerManager.getStatusForUser(userId)
            });
        } catch (error) {
            console.error('[LoggerController] Error starting logger:', error);
            res.status(500).json({ success: false, error: 'Gagal memulai Data Logger' });
        }
    },

    /**
     * Stop logger for the authenticated user
     */
    stop: (req, res) => {
        const userId = req.user?.id;
        const username = req.user?.username;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        LoggerManager.stopForUser(userId);
        res.json({
            success: true,
            message: `Logger stopped untuk ${username}`,
            status: LoggerManager.getStatusForUser(userId)
        });
    },

    /**
     * Configure logger for the authenticated user
     */
    config: (req, res) => {
        const userId = req.user?.id;
        const username = req.user?.username;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { interval, humidity, airTemperature, waterTemperature, temperature } = req.body;

        // Build sensor config if any provided
        let sensorConfig = null;
        if (humidity !== undefined || airTemperature !== undefined || waterTemperature !== undefined || temperature !== undefined) {
            sensorConfig = {};
            if (humidity !== undefined) sensorConfig.humidity = humidity;
            if (airTemperature !== undefined) sensorConfig.airTemperature = airTemperature;
            if (waterTemperature !== undefined) sensorConfig.waterTemperature = waterTemperature;
            if (temperature !== undefined && airTemperature === undefined) sensorConfig.airTemperature = temperature;
            if (temperature !== undefined && waterTemperature === undefined) sensorConfig.waterTemperature = temperature;
        }

        if (!interval && !sensorConfig) {
            return res.status(400).json({ error: 'No valid configuration provided' });
        }

        const status = LoggerManager.configForUser(userId, username, interval, sensorConfig);

        res.json({
            success: true,
            message: 'Logger configured',
            status
        });
    },

    /**
     * Stop a specific user's logger (admin only)
     */
    stopUser: (req, res) => {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'Missing userId' });
        }
        LoggerManager.stopForUser(parseInt(userId));
        res.json({
            success: true,
            message: `Logger stopped for user ${userId}`,
            status: LoggerManager.getStatusForUser(parseInt(userId))
        });
    },

    /**
     * Stop all loggers (admin only)
     */
    stopAll: (req, res) => {
        LoggerManager.stopAll();
        res.json({
            success: true,
            message: 'All loggers stopped',
            ...LoggerManager.getAllStatus()
        });
    }
};

module.exports = LoggerController;
