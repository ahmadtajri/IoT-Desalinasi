const prisma = require('../config/prisma');
const cron   = require('node-cron');
const { spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');

// Windows: 'python', Unix/Linux/Mac: 'python3'
const PYTHON_CMD = os.platform() === 'win32' ? 'python' : 'python3';

const DailyLogService = {
    /**
     * Generate Excel XLSX dengan chart native via Python xlsxwriter
     * Memanggil backend/scripts/generate_xlsx.py lewat child_process.spawn
     * Returns Promise<{ xlsxBase64: string, recordCount: number }>
     */
    generateXLSX(sensorData) {
        return new Promise((resolve, reject) => {
            if (!sensorData || sensorData.length === 0) {
                return resolve({ xlsxBase64: '', recordCount: 0 });
            }

            const scriptPath = path.join(__dirname, '../../scripts/generate_xlsx.py');

            const py = spawn(PYTHON_CMD, [scriptPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let outPath = '';
            let errMsg  = '';

            py.stdout.on('data', (data) => {
                outPath += data.toString();
            });

            py.stderr.on('data', (data) => {
                errMsg += data.toString();
            });

            py.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[DailyLog] Python error:\n${errMsg}`);
                    return reject(new Error(`generate_xlsx.py exited with code ${code}: ${errMsg}`));
                }

                const filePath = outPath.trim();

                try {
                    const buffer     = fs.readFileSync(filePath);
                    const xlsxBase64 = buffer.toString('base64');
                    fs.unlinkSync(filePath); // hapus temp file
                    resolve({ xlsxBase64, recordCount: sensorData.length });
                } catch (err) {
                    console.error(`[DailyLog] Error reading temp xlsx file: ${err.message}`);
                    reject(err);
                }
            });

            py.on('error', (err) => {
                console.error(`[DailyLog] Failed to spawn python3: ${err.message}`);
                reject(err);
            });

            // Kirim data ke Python via stdin
            py.stdin.write(JSON.stringify(sensorData));
            py.stdin.end();
        });
    },

    /**
     * Generate and save daily logs for all users who have data today
     */
    async generateDailyLogs(targetDate = null) {
        const date = targetDate || new Date();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dateOnly = startOfDay.toISOString().slice(0, 10); // YYYY-MM-DD

        console.log(`[DailyLog] Generating daily logs for ${dateOnly}...`);

        try {
            // Find all users who have sensor data for this day
            const usersWithData = await prisma.sensorData.findMany({
                where: {
                    timestamp: { gte: startOfDay, lte: endOfDay },
                    userId: { not: null }
                },
                select: { userId: true },
                distinct: ['userId']
            });

            // Also get data without userId (system/realtime data)
            const systemData = await prisma.sensorData.findMany({
                where: {
                    timestamp: { gte: startOfDay, lte: endOfDay },
                    userId: null
                },
                orderBy: { timestamp: 'asc' }
            });

            const results = [];

            // Generate XLSX for each user
            for (const { userId } of usersWithData) {
                const userData = await prisma.sensorData.findMany({
                    where: {
                        timestamp: { gte: startOfDay, lte: endOfDay },
                        userId: userId
                    },
                    orderBy: { timestamp: 'asc' }
                });

                if (userData.length === 0) continue;

                // Get username
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true }
                });

                const username = user?.username || `user_${userId}`;
                const { xlsxBase64, recordCount } = await this.generateXLSX(userData);
                const fileName = `sensor_report_${username}_${dateOnly}.xlsx`;
                const fileSize = Buffer.byteLength(xlsxBase64, 'base64');

                // Upsert (update if exists for same date+user)
                const log = await prisma.dailyLog.upsert({
                    where: {
                        date_userId: {
                            date: new Date(dateOnly),
                            userId: userId
                        }
                    },
                    update: {
                        csvContent: xlsxBase64,
                        recordCount,
                        fileSize,
                        fileName,
                        userName: username
                    },
                    create: {
                        date: new Date(dateOnly),
                        userId,
                        userName: username,
                        fileName,
                        csvContent: xlsxBase64,
                        recordCount,
                        fileSize
                    }
                });

                results.push(log);
                console.log(`[DailyLog] Saved log for user "${username}": ${recordCount} records, ${fileSize} bytes`);
            }

            // Generate XLSX for system data (no user)
            if (systemData.length > 0) {
                const { xlsxBase64, recordCount } = await this.generateXLSX(systemData);
                const fileName = `sensor_report_system_${dateOnly}.xlsx`;
                const fileSize = Buffer.byteLength(xlsxBase64, 'base64');

                // Can't use upsert with null userId in unique constraint
                const existing = await prisma.dailyLog.findFirst({
                    where: {
                        date: new Date(dateOnly),
                        userId: null
                    }
                });

                let log;
                if (existing) {
                    log = await prisma.dailyLog.update({
                        where: { id: existing.id },
                        data: { csvContent: xlsxBase64, recordCount, fileSize, fileName, userName: 'System' }
                    });
                } else {
                    log = await prisma.dailyLog.create({
                        data: {
                            date: new Date(dateOnly),
                            userId: null,
                            userName: 'System',
                            fileName,
                            csvContent: xlsxBase64,
                            recordCount,
                            fileSize
                        }
                    });
                }

                results.push(log);
                console.log(`[DailyLog] Saved system log: ${recordCount} records, ${fileSize} bytes`);
            }

            console.log(`[DailyLog] Completed: ${results.length} logs generated for ${dateOnly}`);
            return { success: true, count: results.length, date: dateOnly };

        } catch (error) {
            console.error('[DailyLog] Error generating daily logs:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get all daily logs (Admin only — all users)
     */
    async getAll() {
        return prisma.dailyLog.findMany({
            select: {
                id: true,
                date: true,
                userId: true,
                userName: true,
                fileName: true,
                recordCount: true,
                fileSize: true,
                createdAt: true
            },
            orderBy: [
                { date: 'desc' },
                { userName: 'asc' }
            ]
        });
    },

    /**
     * Get daily logs for a specific user only
     */
    async getByUser(userId) {
        return prisma.dailyLog.findMany({
            where: {
                userId,
                isDeletedByUser: false
            },
            select: {
                id: true,
                date: true,
                userId: true,
                userName: true,
                fileName: true,
                recordCount: true,
                fileSize: true,
                createdAt: true
            },
            orderBy: { date: 'desc' }
        });
    },

    /**
     * Get a single log by ID (with CSV content for download)
     */
    async getById(id) {
        return prisma.dailyLog.findUnique({
            where: { id: parseInt(id) }
        });
    },

    /**
     * Delete a log by ID
     */
    async deleteById(id) {
        return prisma.dailyLog.delete({
            where: { id: parseInt(id) }
        });
    },

    /**
     * Soft delete a log by a user (hides from user but keeps for admin)
     */
    async userDelete(id, userId) {
        // Ensure the log belongs to this user before hiding
        const log = await prisma.dailyLog.findUnique({ where: { id: parseInt(id) } });
        if (!log || log.userId !== userId) throw new Error('Log not found or access denied');

        return prisma.dailyLog.update({
            where: { id: parseInt(id) },
            data: { isDeletedByUser: true }
        });
    },

    /**
     * Delete SensorData records older than 24 hours for a user.
     * Called after daily logs are generated so data is preserved in CSV.
     */
    async deleteOldSensorData() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        try {
            const result = await prisma.sensorData.deleteMany({
                where: {
                    timestamp: { lt: cutoff }
                }
            });
            console.log(`[DailyLog] Auto-deleted ${result.count} SensorData records older than 24h`);
            return result.count;
        } catch (error) {
            console.error('[DailyLog] Error auto-deleting old sensor data:', error);
            return 0;
        }
    },

    /**
     * Setup cron job:
     *  - 23:59 WIB: generate daily logs for all users
     *  - 00:05 WIB: auto-delete SensorData > 24h (after logs are safely generated)
     */
    setupCronJob() {
        // Generate daily logs at 23:59 every day
        cron.schedule('59 23 * * *', async () => {
            console.log('[DailyLog] Cron triggered at 23:59 — generating daily logs...');
            await this.generateDailyLogs();
        }, { timezone: 'Asia/Jakarta' });

        // Auto-delete SensorData older than 24h at 00:05 (after logs are done)
        cron.schedule('5 0 * * *', async () => {
            console.log('[DailyLog] Cron triggered at 00:05 — cleaning up old sensor data...');
            await this.deleteOldSensorData();
        }, { timezone: 'Asia/Jakarta' });

        console.log('[DailyLog] Cron jobs scheduled: generate at 23:59 WIB, cleanup at 00:05 WIB');
    }
};

module.exports = DailyLogService;
