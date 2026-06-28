// Authentication Context
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize auth state on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check if token exists
                const token = authService.getAccessToken();
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Try to get current user
                const currentUser = await authService.getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    setIsAuthenticated(true);
                } else {
                    // Token invalid, clear auth
                    await authService.logout();
                }
            } catch (error) {
                console.error('Auth init error:', error);
                await authService.logout();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    // Login function
    const login = useCallback(async (username, password) => {
        try {
            const result = await authService.login(username, password);

            if (result.success) {
                setUser(result.user);
                setIsAuthenticated(true);
                return { success: true };
            }

            return { success: false, message: result.message };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed. Please try again.' };
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        try {
            await authService.logout();
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, []);

    // Check if user is admin
    const isAdmin = useCallback(() => {
        return user?.role === 'ADMIN';
    }, [user]);

    // Check if user is the default admin (seeded, no createdById)
    const isDefaultAdmin = useCallback(() => {
        return user?.role === 'ADMIN' && user?.createdById === null;
    }, [user]);

    // Refresh user data
    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
            }
        } catch (error) {
            console.error('Refresh user error:', error);
        }
    }, []);

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        isAdmin,
        isDefaultAdmin,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
