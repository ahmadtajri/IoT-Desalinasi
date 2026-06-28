// JWT Utilities for Authentication
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate access token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT access token
 */
function generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        throw new Error('Invalid token');
    }
}

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 */
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Object containing access and refresh tokens
 */
function generateTokens(user) {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokens,
};
