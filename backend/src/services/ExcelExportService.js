const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

// Definisi pengelompokan sensor
const SENSOR_GROUPS = {
    suhuUdara: {
        label: 'Suhu Udara (°C)',
        sensors: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7_X']
    },
    suhuAir: {
        label: 'Suhu Air (°C)',
        sensors: ['T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13_X']
    },
    kelembapan: {
        label: 'Kelembapan (%)',
        sensors: ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6', 'RH7_X']
    }
};

// Kolom dummy yang harus selalu ada (isi null)
const DUMMY_COLUMNS = ['T7_X', 'T13_X', 'RH7_X'];

// Semua sensor dalam urutan tampil (untuk Dashboard)
const ALL_SENSOR_ORDER = [
    ...SENSOR_GROUPS.suhuUdara.sensors,
    ...SENSOR_GROUPS.suhuAir.sensors,
    ...SENSOR_GROUPS.kelembapan.sensors
];

const ExcelExportService = {
    /**
     * Transform raw sensor data into pivoted format
     * Input: array of { sensorId, sensorType, value, timestamp, ... }
     * Output: { pivotRows }
     */
    pivotData(sensorData) {
        if (!sensorData || sensorData.length === 0) {
            return { pivotRows: [] };
        }

        // Filter out invalid rows
        const cleanData = sensorData.filter(row => {
            if (!row || !row.sensorId || !row.timestamp) return false;
            if (row.sensorId === 'Sensor ID') return false;
            const val = parseFloat(row.value);
            return !isNaN(val);
        });

        // Sort by timestamp ascending
        cleanData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Group by timestamp (rounded to seconds)
        const timeGroups = new Map();
        for (const row of cleanData) {
            const ts = new Date(row.timestamp);
            ts.setMilliseconds(0);
            const key = ts.toISOString();

            if (!timeGroups.has(key)) {
                timeGroups.set(key, { timestamp: ts, values: {} });
            }
            timeGroups.get(key).values[row.sensorId] = parseFloat(row.value);
        }

        // Build pivot rows
        const pivotRows = [];
        for (const [, group] of timeGroups) {
            const row = {
                timestamp: group.timestamp,
                waktuLengkap: formatDateFull(group.timestamp),
                waktuSaja: formatTimeOnly(group.timestamp)
            };

            for (const sensorId of ALL_SENSOR_ORDER) {
                if (DUMMY_COLUMNS.includes(sensorId)) {
                    row[sensorId] = null;
                } else if (group.values[sensorId] !== undefined) {
                    row[sensorId] = group.values[sensorId];
                } else {
                    row[sensorId] = null;
                }
            }

            pivotRows.push(row);
        }

        return { pivotRows };
    },

    /**
     * Generate Excel workbook buffer from sensor data using Python Child Process
     * @param {Array} sensorData - Raw sensor data from DB
     * @param {string} [title] - Optional title for the report
     * @returns {Promise<Buffer>} - Excel file buffer
     */
    async generateExcel(sensorData, title = null) {
        const { pivotRows } = this.pivotData(sensorData);
        const reportTitle = title || 'Laporan Visualisasi Desalinasi';

        // 1. Buat temporary file paths
        const tmpDir = os.tmpdir();
        const uniqueId = Date.now() + '_' + Math.floor(Math.random() * 10000);
        const inputJsonPath = path.join(tmpDir, `input_${uniqueId}.json`);
        const outputXlsxPath = path.join(tmpDir, `output_${uniqueId}.xlsx`);
        
        try {
            // 2. Tulis pivotRows ke temporary JSON
            fs.writeFileSync(inputJsonPath, JSON.stringify(pivotRows));

            // 3. Panggil Python script via spawnSync
            const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'generate_excel.py');
            
            console.log('[ExcelExportService] Memanggil Python untuk generate Excel...');
            const pythonCommand = `python "${scriptPath}" "${inputJsonPath}" "${outputXlsxPath}" --title "${reportTitle}"`;
            
            try {
                const { execSync } = require('child_process');
                execSync(pythonCommand, { stdio: 'pipe', encoding: 'utf-8' });
            } catch (err) {
                console.error('[ExcelExportService] Python error:', err.stderr || err.message);
                throw new Error('Gagal menjalankan Python: ' + (err.stderr || err.message));
            }

            // 4. Baca file Excel (.xlsx) hasil generate Python ke Buffer
            if (!fs.existsSync(outputXlsxPath)) {
                throw new Error('File Excel tidak ditemukan setelah Python selesai.');
            }
            const excelBuffer = fs.readFileSync(outputXlsxPath);

            console.log('[ExcelExportService] Berhasil men-generate Excel via Python.');
            return excelBuffer;
            
        } catch (error) {
            console.error('[ExcelExportService] Error di generateExcel:', error);
            throw error;
        } finally {
            // 5. Bersihkan (hapus) file temporary
            if (fs.existsSync(inputJsonPath)) fs.unlinkSync(inputJsonPath);
            if (fs.existsSync(outputXlsxPath)) fs.unlinkSync(outputXlsxPath);
        }
    }
};

// ===== Helper Functions =====

function formatDateFull(date) {
    const d = new Date(date);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

function formatTimeOnly(date) {
    const d = new Date(date);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

module.exports = ExcelExportService;
