import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar';
import Dashboard from './pages/user/Dashboard';
import Report from './pages/user/Report';
import DailyLog from './pages/user/DailyLog';
import Login from './pages/public/Login';
import AdminLayout from './pages/admin/AdminLayout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import UserProfileModal from './components/shared/UserProfileModal';
import { LoggerProvider } from './context/LoggerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Menu, LogOut, User, Shield } from 'lucide-react';
import { initPWA } from './utils/pwaUtils';
import { autoCheckBackend } from './utils/backendChecker';
import PropTypes from 'prop-types';

// Header Component with User Info and Profile
function Header({ onMenuClick }) {
    const { user, logout, isAdmin } = useAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);

    const handleLogout = async () => {
        await logout();
        // No need for manual redirect, ProtectedRoute will handle it
    };

    return (
        <>
            <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 hover:bg-white/10 rounded-lg text-gray-300"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-white md:hidden">IoT Desalinasi</span>
                </div>

                {/* User Info - Clickable to open Profile Modal */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowProfileModal(true)}
                        className="flex items-center gap-2 text-sm p-2 rounded-xl hover:bg-white/10 transition-colors group"
                        title="Lihat Profil"
                    >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${isAdmin()
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                            }`}>
                            {isAdmin() ? <Shield size={18} className="text-white" /> : <User size={18} className="text-white" />}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-white font-medium">{user?.username}</p>
                            <p className="text-blue-200/60 text-xs">{user?.role}</p>
                        </div>
                    </button>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="p-2.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                        title="Keluar"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* User Profile Modal */}
            <UserProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </>
    );
}

// Main App Layout (for authenticated users)
function AppLayout() {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full max-w-full bg-slate-900 overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                isMobileOpen={isMobileSidebarOpen}
                setIsMobileOpen={setIsMobileSidebarOpen}
            />

            {/* Main Content Area */}
            <div className="flex-1 h-full flex flex-col min-w-0 max-w-full overflow-hidden">
                {/* Header */}
                <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />

                {/* Scrollable Content */}
                <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/report" element={<Report />} />
                        <Route path="/daily-log" element={<DailyLog />} />
                        <Route
                            path="/admin/*"
                            element={
                                <ProtectedRoute adminOnly>
                                    <AdminLayout />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

// Root App Component
function App() {
    React.useEffect(() => {
        // Initialize PWA features
        initPWA();

        // Check backend connection
        autoCheckBackend();
    }, []);

    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    {/* Public Route */}
                    <Route path="/login" element={<LoginRoute />} />

                    {/* Protected Routes - LoggerProvider only active when authenticated */}
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <LoggerProvider>
                                    <AppLayout />
                                </LoggerProvider>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

// Login Route - redirect to home if already logged in
function LoginRoute() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Login />;
}

Header.propTypes = {
    onMenuClick: PropTypes.func.isRequired
};

export default App;
