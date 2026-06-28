// Authentication Middleware
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Please login first.',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = verifyAccessToken(token);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Please login again.',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact admin.',
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please login again.',
            error: error.message,
        });
    }
}

/**
 * Middleware to check if user has admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
        });
    }

    next();
}

/**
 * Middleware to check if user has user role (or admin)
 */
function requireUser(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    // Both USER and ADMIN can access user routes
    if (req.user.role !== 'USER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. User privileges required.',
        });
    }

    next();
}

/**
 * Optional authentication - doesn't fail if no token
 * Used for routes that work differently for authenticated users
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7);
        const decoded = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        req.user = user && user.isActive ? user : null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
}

module.exports = {
    authenticate,
    requireAdmin,
    requireUser,
    optionalAuth,
};
