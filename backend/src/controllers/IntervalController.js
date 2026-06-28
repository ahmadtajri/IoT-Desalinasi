// Logger Interval Management Controller
const prisma = require('../config/prisma');

/**
 * Get all available global intervals
 */
async function getAllIntervals(req, res) {
    try {
        const intervals = await prisma.loggerInterval.findMany({
            orderBy: { intervalSeconds: 'asc' },
        });

        // If authenticated user, get their active interval
        let activeIntervalId = null;
        if (req.user) {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { activeIntervalId: true }
            });
            activeIntervalId = user?.activeIntervalId;
        }

        return res.status(200).json({
            success: true,
            data: intervals.map(i => ({
                ...i,
                isActive: i.id === activeIntervalId // Mark if selected by current user
            })),
            activeIntervalId
        });
    } catch (error) {
        console.error('Get intervals error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get intervals.',
            error: error.message,
        });
    }
}

/**
 * Create global interval (Admin only)
 */
async function createInterval(req, res) {
    try {
        const { intervalSeconds, intervalName } = req.body;

        if (!intervalSeconds || !intervalName) {
            return res.status(400).json({
                success: false,
                message: 'intervalSeconds and intervalName are required.',
            });
        }

        const existingInterval = await prisma.loggerInterval.findUnique({
            where: { intervalSeconds: parseInt(intervalSeconds) },
        });

        if (existingInterval) {
            return res.status(400).json({
                success: false,
                message: 'Interval with these seconds already exists.',
            });
        }

        const interval = await prisma.loggerInterval.create({
            data: {
                intervalSeconds: parseInt(intervalSeconds),
                intervalName,
            },
        });

        return res.status(201).json({
            success: true,
            message: 'Global interval created successfully.',
            data: interval,
        });
    } catch (error) {
        console.error('Create interval error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create interval.',
            error: error.message,
        });
    }
}

/**
 * Update global interval (Admin only)
 */
async function updateInterval(req, res) {
    try {
        const { id } = req.params;
        const { intervalSeconds, intervalName } = req.body;

        const updateData = {};
        if (intervalSeconds) updateData.intervalSeconds = parseInt(intervalSeconds);
        if (intervalName) updateData.intervalName = intervalName;

        const updatedInterval = await prisma.loggerInterval.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        return res.status(200).json({
            success: true,
            message: 'Interval updated successfully.',
            data: updatedInterval,
        });
    } catch (error) {
        console.error('Update interval error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update interval.',
            error: error.message,
        });
    }
}

/**
 * Delete global interval (Admin only)
 */
async function deleteInterval(req, res) {
    try {
        const { id } = req.params;

        await prisma.loggerInterval.delete({
            where: { id: parseInt(id) },
        });

        return res.status(200).json({
            success: true,
            message: 'Interval deleted successfully.',
        });
    } catch (error) {
        console.error('Delete interval error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete interval.',
            error: error.message,
        });
    }
}

/**
 * Set active interval for current user
 */
async function setActiveInterval(req, res) {
    try {
        const { id } = req.params; // ID of the global interval
        const userId = req.user.id;

        // Verify interval exists
        const interval = await prisma.loggerInterval.findUnique({
            where: { id: parseInt(id) },
        });

        if (!interval) {
            return res.status(404).json({
                success: false,
                message: 'Interval not found.',
            });
        }

        // Update user's active interval
        await prisma.user.update({
            where: { id: userId },
            data: { activeIntervalId: interval.id },
        });

        return res.status(200).json({
            success: true,
            message: 'Active interval updated successfully.',
            data: interval,
        });
    } catch (error) {
        console.error('Set active interval error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to set active interval.',
            error: error.message,
        });
    }
}

/**
 * Get current user's active interval
 */
async function getActiveInterval(req, res) {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { activeInterval: true }
        });

        if (!user.activeInterval) {
            // If no interval selected, return first available or default logic
            const defaultInterval = await prisma.loggerInterval.findFirst({
                orderBy: { intervalSeconds: 'asc' }
            });

            return res.status(200).json({
                success: true,
                data: defaultInterval || null,
                isDefault: true
            });
        }

        return res.status(200).json({
            success: true,
            data: user.activeInterval,
        });
    } catch (error) {
        console.error('Get active interval error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get active interval.',
            error: error.message,
        });
    }
}

module.exports = {
    getAllIntervals,
    createInterval,
    updateInterval,
    deleteInterval,
    setActiveInterval,
    getActiveInterval,
};
