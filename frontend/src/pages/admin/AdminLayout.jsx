import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Settings, Users, Clock, Thermometer, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SensorConfig from './SensorConfig';
import UserManagement from './UserManagement';
import IntervalSettings from './IntervalSettings';
import DailyLog from '../user/DailyLog';

const tabs = [
    { path: 'sensor', label: 'Konfigurasi Sensor', icon: Thermometer, color: 'text-orange-500' },
    { path: 'users', label: 'Kelola Pengguna', icon: Users, color: 'text-purple-500' },
    { path: 'intervals', label: 'Pengaturan Interval', icon: Clock, color: 'text-blue-500' },
    { path: 'daily-logs', label: 'Daily Logs', icon: FileText, color: 'text-green-500' },
];

export default function AdminLayout() {
    const { user: currentUser } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 w-full max-w-full overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                <Settings className="w-7 h-7 text-blue-500" />
                                Panel Admin
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Kelola sensor, pengguna, dan pengaturan sistem</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-200">
                                <span className="text-sm text-gray-600">Masuk sebagai: </span>
                                <span className="font-semibold text-blue-700">{currentUser?.username}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <nav className="flex border-b border-gray-100">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <NavLink
                                    key={tab.path}
                                    to={`/admin/${tab.path}`}
                                    end
                                    className={({ isActive }) =>
                                        `flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-2 ${isActive
                                            ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <Icon size={18} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* Tab Content */}
                    <div className="p-6">
                        <Routes>
                            <Route index element={<Navigate to="/admin/sensor" replace />} />
                            <Route path="sensor" element={<SensorConfig />} />
                            <Route path="users" element={<UserManagement />} />
                            <Route path="intervals" element={<IntervalSettings />} />
                            <Route path="daily-logs" element={<DailyLog />} />
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
}
