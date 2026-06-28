// Authentication Service
import api from './api';

const TOKEN_KEY = 'iot_access_token';
const REFRESH_TOKEN_KEY = 'iot_refresh_token';
const USER_KEY = 'iot_user';

/**
 * Authentication Service
 */
const authService = {
    /**
     * Login user
     */
    async login(username, password) {
        try {
            const response = await api.post('/auth/login', { username, password }, {
                _noRetry: true // Prevent interceptor retry on login
            });

            if (response.data.success) {
                const { accessToken, refreshToken, user } = response.data.data;

                // Store tokens and user data
                localStorage.setItem(TOKEN_KEY, accessToken);
                localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
                localStorage.setItem(USER_KEY, JSON.stringify(user));

                // Set token in axios header
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

                return { success: true, user };
            }

            return { success: false, message: response.data.message };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed. Please try again.',
            };
        }
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                await api.post('/auth/logout');
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Logout error:', error);
            }
        } finally {
            // Clear local storage
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);

            // Remove token from axios header
            delete api.defaults.headers.common['Authorization'];
        }
    },

    /**
     * Get current user
     */
    async getCurrentUser() {
        try {
            const response = await api.get('/auth/me');

            if (response.data.success) {
                const user = response.data.data;
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                return user;
            }

            return null;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    },

    /**
     * Refresh access token
     */
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

            if (!refreshToken) {
                return false;
            }

            const response = await api.post('/auth/refresh', { refreshToken }, {
                _noRetry: true // Prevent interceptor retry on refresh
            });

            if (response.data.success) {
                const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                localStorage.setItem(TOKEN_KEY, accessToken);
                localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

                return true;
            }

            return false;
        } catch (error) {
            console.error('Refresh token error:', error);
            return false;
        }
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored user data
     */
    getStoredUser() {
        const userStr = localStorage.getItem(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Get stored access token
     */
    getAccessToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Check if user is admin
     */
    isAdmin() {
        const user = this.getStoredUser();
        return user?.role === 'ADMIN';
    },

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await api.patch('/users/change-password', {
                currentPassword,
                newPassword,
            });

            return {
                success: response.data.success,
                message: response.data.message,
            };
        } catch (error) {
            console.error('Change password error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Gagal mengubah password.',
            };
        }
    },

    /**
     * Update own account (username, email, password)
     */
    async updateAccount({ username, email, currentPassword, newPassword }) {
        try {
            const response = await api.put('/auth/account', {
                username,
                email,
                currentPassword,
                newPassword,
            });

            if (response.data.success) {
                // Update stored user data
                const storedUser = this.getStoredUser();
                if (storedUser && response.data.data) {
                    const updated = { ...storedUser, ...response.data.data };
                    localStorage.setItem(USER_KEY, JSON.stringify(updated));
                }
            }

            return {
                success: response.data.success,
                message: response.data.message,
                data: response.data.data,
            };
        } catch (error) {
            console.error('Update account error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Gagal memperbarui akun.',
            };
        }
    },

    /**
     * Initialize auth - restore token to axios if exists
     */
    initAuth() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    },
};

// Initialize auth on module load
authService.initAuth();

// Add axios interceptor for token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Skip retry for:
        // 1. Requests with _noRetry flag (login, getCurrentUser initial check)
        // 2. Already retried requests
        // 3. Auth endpoints that should never be retried (login, refresh, logout)
        const noRetryEndpoints = ['/auth/login', '/auth/refresh', '/auth/logout'];
        const isNoRetryAuthEndpoint = noRetryEndpoints.some(ep => originalRequest.url?.includes(ep));
        const shouldNotRetry = originalRequest._noRetry || originalRequest._retry || isNoRetryAuthEndpoint;

        // If 401 and should retry
        if (error.response?.status === 401 && !shouldNotRetry) {
            originalRequest._retry = true;

            // Try to refresh token
            const refreshed = await authService.refreshToken();

            if (refreshed) {
                // Retry original request with new token
                originalRequest.headers['Authorization'] = `Bearer ${authService.getAccessToken()}`;
                return api(originalRequest);
            }

            // Refresh failed, logout user (only if not already on login page)
            if (!window.location.pathname.includes('/login')) {
                await authService.logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default authService;
