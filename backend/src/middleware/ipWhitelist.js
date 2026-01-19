// IP Whitelist Middleware for ESP32 Security
// Only allows whitelisted IPs to POST sensor data in production mode

const dotenv = require('dotenv');
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const enableWhitelist = process.env.ENABLE_IP_WHITELIST === 'true';

// Parse ESP32 whitelist from environment variable
const getWhitelistedIPs = () => {
    const whitelist = process.env.ESP32_WHITELIST || '';
    return whitelist.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
};

// Get client IP address (handles proxy/forwarded IPs)
const getClientIP = (req) => {
    // Check for forwarded IP (if behind proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    // Check for real IP
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }

    // Fallback to connection remote address
    const ip = req.connection.remoteAddress || req.socket.remoteAddress;

    // Convert IPv6 localhost to IPv4
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        return '127.0.0.1';
    }

    // Remove IPv6 prefix if present
    return ip.replace('::ffff:', '');
};

// Middleware function
const ipWhitelistMiddleware = (req, res, next) => {
    // Skip whitelist check in development mode or if whitelist is disabled
    if (!isProduction || !enableWhitelist) {
        return next();
    }

    // Only check POST requests (ESP32 sending data)
    if (req.method !== 'POST') {
        return next();
    }

    // Get client IP
    const clientIP = getClientIP(req);
    const whitelistedIPs = getWhitelistedIPs();

    console.log(`[IP Whitelist] Checking IP: ${clientIP}`);
    console.log(`[IP Whitelist] Allowed IPs: ${whitelistedIPs.join(', ')}`);

    // Check if IP is whitelisted
    if (whitelistedIPs.includes(clientIP)) {
        console.log(`[IP Whitelist] ✅ IP ${clientIP} is whitelisted`);
        return next();
    }

    // IP not whitelisted - reject request
    console.warn(`[IP Whitelist] ❌ BLOCKED: IP ${clientIP} is not whitelisted`);
    return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied. Only ESP32 devices are allowed to send data in production mode.',
        ip: clientIP,
        timestamp: new Date().toISOString()
    });
};

// Logging middleware to track all requests
const requestLoggerMiddleware = (req, res, next) => {
    const clientIP = getClientIP(req);
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] ${req.method} ${req.path} from ${clientIP}`);

    next();
};

module.exports = {
    ipWhitelistMiddleware,
    requestLoggerMiddleware,
    getClientIP,
    getWhitelistedIPs
};
