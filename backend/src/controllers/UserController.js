// User Management Controller (Admin Only)
const prisma = require('../config/prisma');
const { hashPassword } = require('../utils/password');

/**
 * Get all users (Admin only)
 */
async function getAllUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                createdById: true,
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                activeInterval: {
                    select: {
                        id: true,
                        intervalSeconds: true,
                        intervalName: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return res.status(200).json({
            success: true,
            data: users,
            count: users.length,
        });
    } catch (error) {
        console.error('Get all users error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get users.',
            error: error.message,
        });
    }
}

/**
 * Get user by ID (Admin only)
 */
async function getUserById(req, res) {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                activeInterval: {
                    select: {
                        id: true,
                        intervalSeconds: true,
                        intervalName: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        sensorData: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get user.',
            error: error.message,
        });
    }
}

/**
 * Create new user (Admin only)
 */
async function createUser(req, res) {
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
                createdById: req.user.id,
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
            message: 'User created successfully.',
            data: user,
        });
    } catch (error) {
        console.error('Create user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create user.',
            error: error.message,
        });
    }
}

/**
 * Update user (Admin only)
 */
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { username, email, password, role } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        // Prevent editing default admin by other admins
        if (existingUser.role === 'ADMIN' && existingUser.createdById === null && existingUser.id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Default admin account cannot be edited by other admins.',
            });
        }

        // Prepare update data
        const updateData = {};

        if (username) {
            // Check if username is taken by another user
            const userWithUsername = await prisma.user.findFirst({
                where: {
                    username,
                    NOT: { id: parseInt(id) },
                },
            });

            if (userWithUsername) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already exists.',
                });
            }

            updateData.username = username;
        }

        if (email) {
            // Check if email is taken by another user
            const userWithEmail = await prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: parseInt(id) },
                },
            });

            if (userWithEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists.',
                });
            }

            updateData.email = email;
        }

        if (password) {
            updateData.password = await hashPassword(password);
        }

        if (role) {
            updateData.role = role.toUpperCase();
        }

        // Update user
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'User updated successfully.',
            data: user,
        });
    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update user.',
            error: error.message,
        });
    }
}

/**
 * Delete user (Admin only)
 */
async function deleteUser(req, res) {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        // Prevent deleting yourself
        if (user.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account.',
            });
        }

        // Prevent deleting default admin (seeded, no createdById)
        if (user.role === 'ADMIN' && user.createdById === null) {
            return res.status(403).json({
                success: false,
                message: 'Default admin account cannot be deleted.',
            });
        }

        // Delete user (cascade will delete intervals and set sensorData userId to null)
        await prisma.user.delete({
            where: { id: parseInt(id) },
        });

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully.',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete user.',
            error: error.message,
        });
    }
}

/**
 * Toggle user active status (Admin only)
 */
async function toggleUserStatus(req, res) {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.',
            });
        }

        // Prevent deactivating yourself
        if (user.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account.',
            });
        }

        // Prevent deactivating default admin (seeded, no createdById)
        if (user.role === 'ADMIN' && user.createdById === null) {
            return res.status(403).json({
                success: false,
                message: 'Default admin account cannot be deactivated.',
            });
        }

        // Toggle status
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { isActive: !user.isActive },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully.`,
            data: updatedUser,
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle user status.',
            error: error.message,
        });
    }
}

/**
 * Change password (for logged-in user)
 */
const { comparePassword } = require('../utils/password');

async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password lama dan password baru harus diisi.',
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password baru minimal 6 karakter.',
            });
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan.',
            });
        }

        // Verify current password
        const isPasswordValid = await comparePassword(currentPassword, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Password lama tidak sesuai.',
            });
        }

        // Hash and update new password
        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return res.status(200).json({
            success: true,
            message: 'Password berhasil diubah.',
        });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengubah password.',
            error: error.message,
        });
    }
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    changePassword,
};
