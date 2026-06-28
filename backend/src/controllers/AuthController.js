// Authentication Controller
const prisma = require('../config/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');

/**
 * Register new user (Admin only)
 */
async function register(req, res) {
    try {
        const { username, email, password, role = 'USER' } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required.',
            });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.username === username
                    ? 'Username already exists.'
                    : 'Email already exists.',
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: role.toUpperCase(),
                createdById: req.user?.id, // Admin who created this user
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully.',
            data: user,
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register user.',
            error: error.message,
        });
    }
}

/**
 * Login user (accepts username or email)
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;

        // Validation - username field can contain either username or email
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username/Email and password are required.',
            });
        }

        // Check if input is email format
        const isEmail = username.includes('@');

        // Find user by username or email
        const user = await prisma.user.findFirst({
            where: isEmail
                ? { email: username }
                : { username: username },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username/email or password.',
            });
        }

        // Check if user is active
        if (!user.isActive) {
            console.log(`Login failed: User ${username} is inactive`);
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact admin.',
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            console.log(`Login failed: Invalid password for user ${username}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid username/email or password.',
            });
        }

        console.log(`Login successful for user ${username}`);

        // Generate tokens
        const tokens = generateTokens(user);

        // Return user data and tokens
        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
                ...tokens,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to login.',
            error: error.message,
        });
    }
}

/**
 * Get current user info
 */
async function getCurrentUser(req, res) {
    try {
        // Updated to use activeInterval relation (global intervals)
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                createdById: true, // null = default admin (seeded)
                activeInterval: true, // Fetch the active global interval
            },
        });

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get user info.',
            error: error.message,
        });
    }
}

/**
 * Update own account (username, email, password)
 */
async function updateAccount(req, res) {
    try {
        const userId = req.user.id;
        const { username, email, currentPassword, newPassword } = req.body;

        // At least one field must be provided
        if (!username && !email && !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diubah.',
            });
        }

        // Get current user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan.',
            });
        }

        // Check if user is default admin (only default admin can change email)
        const isDefaultAdmin = user.role === 'ADMIN' && user.createdById === null;

        if (email && !isDefaultAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Hanya default admin yang dapat mengubah email.',
            });
        }

        // If changing password, verify current password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Password lama harus diisi untuk mengubah password.',
                });
            }

            const isPasswordValid = await comparePassword(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Password lama tidak sesuai.',
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password baru minimal 6 karakter.',
                });
            }
        }

        // Prepare update data
        const updateData = {};

        if (username && username !== user.username) {
            // Check if username is taken
            const existing = await prisma.user.findFirst({
                where: { username, NOT: { id: userId } },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Username sudah digunakan.',
                });
            }
            updateData.username = username;
        }

        if (email && email !== user.email) {
            // Check if email is taken
            const existing = await prisma.user.findFirst({
                where: { email, NOT: { id: userId } },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Email sudah digunakan.',
                });
            }
            updateData.email = email;
        }

        if (newPassword) {
            updateData.password = await hashPassword(newPassword);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Tidak ada perubahan.',
            });
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                createdById: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Akun berhasil diperbarui.',
            data: updatedUser,
        });
    } catch (error) {
        console.error('Update account error:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal memperbarui akun.',
            error: error.message,
        });
    }
}

/**
 * Refresh access token
 */
async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required.',
            });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token or user not found.',
            });
        }

        // Generate new tokens
        const tokens = generateTokens(user);

        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully.',
            data: tokens,
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token.',
            error: error.message,
        });
    }
}

/**
 * Logout user (client-side token removal)
 */
function logout(req, res) {
    return res.status(200).json({
        success: true,
        message: 'Logout successful. Please remove tokens from client.',
    });
}

module.exports = {
    register,
    login,
    getCurrentUser,
    updateAccount,
    refreshToken,
    logout,
};
