/**
 * Script untuk meng-inject data mock sensor ke backend yang sedang berjalan
 * Mensimulasikan data dari 18 sensor desalinasi (T1-T12, RH1-RH6)
 * selama beberapa interval waktu.
 * 
 * Jalankan: node inject_mock_data.js
 */

const http = require('http');

const API_BASE = 'http://localhost:3000/api';

// Kredensial admin dari .env
const ADMIN_CREDENTIALS = {
    username: 'superadmin',
    password: 'superadmin123'
};

// Sensor definitions
const SENSORS = {
    air_temperature: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    water_temperature: ['T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    humidity: ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6']
};

// Realistic base values and ranges
const SENSOR_PROFILES = {
    T1: { base: 32, range: 3 },   T2: { base: 34, range: 4 },
    T3: { base: 31, range: 3 },   T4: { base: 35, range: 5 },
    T5: { base: 33, range: 3 },   T6: { base: 30, range: 4 },
    T7: { base: 28, range: 2 },   T8: { base: 27, range: 3 },
    T9: { base: 29, range: 2 },   T10: { base: 26, range: 3 },
    T11: { base: 28, range: 2 },  T12: { base: 27, range: 2 },
    RH1: { base: 65, range: 10 }, RH2: { base: 70, range: 8 },
    RH3: { base: 68, range: 12 }, RH4: { base: 72, range: 6 },
    RH5: { base: 66, range: 10 }, RH6: { base: 74, range: 8 }
};

function httpRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function login() {
    console.log('🔑 Logging in as admin...');
    const res = await httpRequest('POST', '/auth/login', ADMIN_CREDENTIALS);
    const token = res.data?.data?.accessToken || res.data?.token || res.data?.accessToken;
    if (!token) {
        console.error('❌ Login gagal:', JSON.stringify(res.data, null, 2));
        process.exit(1);
    }
    console.log('✅ Login berhasil!');
    return token;
}

function generateValue(sensorId, timeIndex, totalPoints) {
    const profile = SENSOR_PROFILES[sensorId];
    if (!profile) return 25 + Math.random() * 10;

    // Create a smooth wave pattern + some noise
    const progress = timeIndex / totalPoints;
    const wave = Math.sin(progress * Math.PI * 2) * (profile.range / 2);
    const trend = progress * (profile.range / 3); // slight upward trend
    const noise = (Math.random() - 0.5) * 2;

    return parseFloat((profile.base + wave + trend + noise).toFixed(2));
}

async function injectData(token) {
    const TOTAL_POINTS = 20; // 20 time points
    const INTERVAL_MS = 300000; // 5 minutes apart
    const now = Date.now();

    let totalRecords = 0;
    let errors = 0;

    console.log(`\n📊 Injecting ${TOTAL_POINTS} time points × ${Object.values(SENSORS).flat().length} sensors...`);
    console.log('─'.repeat(60));

    for (let i = TOTAL_POINTS - 1; i >= 0; i--) {
        const timestamp = new Date(now - i * INTERVAL_MS).toISOString();
        const timeLabel = new Date(now - i * INTERVAL_MS).toLocaleTimeString('id-ID');

        process.stdout.write(`⏰ ${timeLabel} | `);

        for (const [sensorType, sensorIds] of Object.entries(SENSORS)) {
            for (const sensorId of sensorIds) {
                const value = generateValue(sensorId, TOTAL_POINTS - 1 - i, TOTAL_POINTS);

                try {
                    const res = await httpRequest('POST', '/sensors', {
                        sensor_id: sensorId,
                        sensor_type: sensorType,
                        value: value,
                        unit: sensorType === 'humidity' ? '%' : '°C',
                        status: 'active',
                        interval: 5
                    }, token);

                    if (res.status === 201) {
                        totalRecords++;
                    } else {
                        errors++;
                    }
                } catch (err) {
                    errors++;
                }
            }
        }
        process.stdout.write(`✓ ${Object.values(SENSORS).flat().length} sensors\n`);
    }

    console.log('─'.repeat(60));
    console.log(`\n✅ Selesai! ${totalRecords} records berhasil di-inject.`);
    if (errors > 0) {
        console.log(`⚠️  ${errors} errors terjadi.`);
    }
    console.log(`\n📋 Data tersedia di: http://localhost:3000/api/sensors?limit=500`);
    console.log(`📊 Buka frontend untuk test export Excel.`);
}

async function main() {
    console.log('═'.repeat(60));
    console.log('  🧪 IoT Desalinasi - Mock Data Injector');
    console.log('═'.repeat(60));

    try {
        const token = await login();
        await injectData(token);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

main();
