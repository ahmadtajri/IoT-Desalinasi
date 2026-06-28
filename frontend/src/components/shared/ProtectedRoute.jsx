// Protected Route Component
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {boolean} props.adminOnly - If true, only admins can access
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
    const { isAuthenticated, loading, isAdmin } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking auth status
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                    <p className="text-blue-200">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check admin access if required
    if (adminOnly && !isAdmin()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🚫</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-blue-200/80 mb-6">
                        You don&apos;t have permission to access this page. Only administrators can view this content.
                    </p>
                    <a
                        href="/"
                        className="inline-block py-2 px-6 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 hover:scale-105 transition-all"
                    >
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return children;
}

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
    adminOnly: PropTypes.bool
};
