const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const intervalRoutes = require('./routes/intervals');
const schemaRoutes = require('./routes/schema');
const sensorConfigRoutes = require('./routes/sensorConfigRoutes');
const valveRoutes = require('./routes/valve');

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// 0. Trust proxy - PENTING untuk Nginx reverse proxy
//    Tanpa ini, express-rate-limit error: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// 1. Remove X-Powered-By header (hides Express fingerprint)
app.disable('x-powered-by');

// 2. Helmet - Sets various HTTP security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for API, frontend handles CSP
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 3. CORS - Restrict allowed origins
const allowedOrigins = [
    'http://localhost:5173',             // Vite dev server
    'http://localhost:5174',
    'http://localhost',
    'http://72.61.214.239',              // VPS IP (via Nginx)
    'https://72.61.214.239',
    'http://iot.desalinasiac.cloud',     // Domain utama
    'https://iot.desalinasiac.cloud',
    'http://desalinasiac.cloud',         // Root domain
    'https://desalinasiac.cloud',
    'http://www.desalinasiac.cloud',     // www subdomain
    'https://www.desalinasiac.cloud',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (ESP32, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`⚠️ CORS blocked request from: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));

// 4. Rate Limiting - Prevent brute force / DDoS
// General API rate limit
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1500,                // Max 1500 requests per 15 min per IP
    message: {                // (IoT dashboard polls /sensors/realtime every 2s = ~450/15min,
        success: false,       //  plus /logger/status, /backend check, etc.)
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
});

// Strict rate limit for auth endpoints (login, register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                  // Max 20 login attempts per 15 min per IP
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
});

// ESP32 endpoints need higher limits (frequent sensor data)
const esp32Limiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 120,                  // Max 120 requests per minute (2/sec)
    message: {
        success: false,
        message: 'ESP32 rate limit exceeded.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
});

// Apply general rate limit to all API routes
app.use('/api', apiLimiter);

app.use(express.json({ limit: '10mb' })); // Increase limit for SVG uploads

// ============================================
// ROUTES
// ============================================

// Authentication routes (with strict rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// User management routes (admin only)
app.use('/api/users', userRoutes);

// Interval management routes
app.use('/api/intervals', intervalRoutes);

// Schema management routes
app.use('/api/schema', schemaRoutes);

// Sensor configuration routes
app.use('/api/sensor-config', sensorConfigRoutes);

// Valve control routes
app.use('/api/valve', valveRoutes);

// Main API routes (includes ESP32 endpoints with higher rate limit)
app.use('/api/esp32', esp32Limiter); // Apply ESP32-specific rate limit
app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('IoT Desalinasi Monitoring API - v2.0 with RBAC & Security');
});

module.exports = app;
