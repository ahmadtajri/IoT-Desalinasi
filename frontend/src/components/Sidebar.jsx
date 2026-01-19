import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ChevronLeft, ChevronRight, Activity, X, FileImage, Power, Cog } from 'lucide-react';
import logoIcon from '../assets/icons/icon-x192.png';
import skemaDesalinasi from '../assets/skema-desalinasi.svg';
import useBackendStatus from '../hooks/useBackendStatus';
import { useLogger } from '../context/LoggerContext';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showSchemaModal, setShowSchemaModal] = useState(false);
    const location = useLocation();
    const { isOnline, isChecking } = useBackendStatus(5000);

    // Get pump/machine status from LoggerContext (data from ESP32)
    const { pumpStatus } = useLogger();
    const isMachineRunning = pumpStatus === true || pumpStatus === 'on' || pumpStatus === 'ON' || pumpStatus === 1;

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/report', label: 'Report', icon: FileText },
    ];

    // Determine status color and text based on backend connection
    const statusColor = isOnline ? 'green' : 'red';
    const statusText = isChecking ? 'Checking...' : (isOnline ? 'System Online' : 'System Offline');
    const statusSubtext = isOnline ? 'Connected' : 'Not Running';

    const handleLinkClick = () => {
        if (window.innerWidth < 768) {
            setIsMobileOpen(false);
        }
    };

    const handleSchemaClick = () => {
        setShowSchemaModal(true);
        if (window.innerWidth < 768) {
            setIsMobileOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`
                    fixed md:relative inset-y-0 left-0 z-50 shrink-0
                    bg-white border-r border-gray-200 flex flex-col 
                    transition-all duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isCollapsed ? 'md:w-20' : 'md:w-72'}
                    w-72
                `}
            >
                {/* Desktop Toggle Button - positioned at edge but inside container area */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex absolute right-0 top-9 translate-x-1/2 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition-colors z-[60]"
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                {/* Mobile Close Button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="md:hidden absolute right-4 top-4 p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                    <X size={20} />
                </button>

                {/* Header / Logo */}
                <div className={`p-6 border-b border-gray-100 flex items-center ${isCollapsed ? 'md:justify-center' : 'gap-4'}`}>
                    <div className="shrink-0">
                        <img src={logoIcon} alt="Logo" className="w-16 h-16 rounded-xl shadow-md" />
                    </div>

                    <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
                        <h2 className="text-xl font-bold text-gray-800">IoT Monitor</h2>
                        <p className="text-xs text-gray-500">Sistem Desalinasi</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 mt-2 overflow-y-auto">
                    <ul className="space-y-2">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    onClick={handleLinkClick}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${isActive(item.path)
                                        ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        } ${isCollapsed ? 'md:justify-center' : ''}`}
                                >
                                    <item.icon
                                        size={22}
                                        className={`shrink-0 ${isActive(item.path) ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`}
                                    />

                                    <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
                                        {item.label}
                                    </span>

                                    {/* Tooltip for collapsed mode */}
                                    {isCollapsed && (
                                        <div className="hidden md:block absolute left-full ml-4 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-xl">
                                            {item.label}
                                            {/* Arrow */}
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                                        </div>
                                    )}
                                </Link>
                            </li>
                        ))}

                        {/* Skema Desalinasi Button */}
                        <li>
                            <button
                                onClick={handleSchemaClick}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative text-gray-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:text-blue-600 ${isCollapsed ? 'md:justify-center' : ''}`}
                            >
                                <FileImage
                                    size={22}
                                    className="shrink-0 text-gray-500 group-hover:text-blue-600"
                                />

                                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
                                    Skema Desalinasi
                                </span>

                                {/* Tooltip for collapsed mode */}
                                {isCollapsed && (
                                    <div className="hidden md:block absolute left-full ml-4 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-xl">
                                        Skema Desalinasi
                                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                                    </div>
                                )}
                            </button>
                        </li>
                    </ul>
                </nav>

                {/* Footer Status */}
                <div className="p-4 border-t border-gray-100 mt-auto">
                    <div className={`bg-gray-50 rounded-xl transition-all duration-300 ${isCollapsed ? 'md:p-3 md:flex md:flex-col md:items-center md:gap-2' : 'p-4'}`}>
                        <div className={`${isCollapsed ? 'md:hidden' : 'block'}`}>
                            <p className="text-xs text-gray-500 font-medium uppercase mb-3">System Status</p>

                            {/* Backend Connection Status */}
                            <div className={`flex items-center gap-3 bg-white p-2.5 rounded-lg border shadow-sm transition-colors mb-2 ${isOnline ? 'border-green-100' : 'border-red-100'
                                }`}>
                                <div className="relative shrink-0">
                                    <div className={`w-3 h-3 bg-${statusColor}-500 rounded-full`}></div>
                                    {isOnline && (
                                        <div className={`w-3 h-3 bg-${statusColor}-500 rounded-full animate-ping absolute top-0 left-0 opacity-75`}></div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isOnline ? 'text-gray-700' : 'text-red-600'}`}>
                                        {statusText}
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate">{statusSubtext}</p>
                                </div>
                            </div>

                            {/* Machine Running Status */}
                            <div className={`flex items-center gap-3 bg-white p-2.5 rounded-lg border shadow-sm transition-colors ${isMachineRunning ? 'border-green-100' : 'border-gray-200'
                                }`}>
                                <div className="relative shrink-0">
                                    <div className={`w-3 h-3 ${isMachineRunning ? 'bg-green-500' : 'bg-gray-400'} rounded-full`}></div>
                                    {isMachineRunning && (
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isMachineRunning ? 'text-gray-700' : 'text-gray-500'}`}>
                                        Mesin Desalinasi
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate">
                                        {isMachineRunning ? 'Sedang Berjalan' : 'Tidak Aktif'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Collapsed Icon Mode (Desktop Only) */}
                        <div className={`hidden ${isCollapsed ? 'md:flex md:flex-col md:gap-2' : ''} relative`}>
                            {/* System Status Icon */}
                            <div className="relative group cursor-help">
                                <Activity size={20} className={`text-${statusColor}-500`} />
                                <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full absolute -top-0.5 -right-0.5 ${isOnline ? 'animate-pulse' : ''}`}></div>

                                {/* Tooltip */}
                                <div className="absolute left-full ml-4 bottom-0 px-3 py-2 bg-white border border-gray-100 text-gray-700 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-xl">
                                    <p className={`font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>{statusText}</p>
                                    <p className="text-gray-400">{statusSubtext}</p>
                                </div>
                            </div>

                            {/* Machine Status Icon */}
                            <div className="relative group cursor-help">
                                <Cog size={20} className={`${isMachineRunning ? 'text-green-500' : 'text-gray-400'}`} />
                                <div className={`w-2 h-2 ${isMachineRunning ? 'bg-green-500' : 'bg-gray-400'} rounded-full absolute -top-0.5 -right-0.5 ${isMachineRunning ? 'animate-pulse' : ''}`}></div>

                                {/* Tooltip */}
                                <div className="absolute left-full ml-4 bottom-0 px-3 py-2 bg-white border border-gray-100 text-gray-700 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-xl">
                                    <p className={`font-bold ${isMachineRunning ? 'text-green-600' : 'text-gray-500'}`}>Mesin Desalinasi</p>
                                    <p className={isMachineRunning ? 'text-green-500' : 'text-gray-400'}>
                                        {isMachineRunning ? 'Sedang Berjalan' : 'Tidak Aktif'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Schema Modal */}
            {showSchemaModal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                    onClick={() => setShowSchemaModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <FileImage size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">Skema Sistem Desalinasi</h2>
                                    <p className="text-blue-100 text-sm mt-1">Diagram alur proses desalinasi air laut</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSchemaModal(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-auto max-h-[calc(90vh-180px)]">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <img
                                    src={skemaDesalinasi}
                                    alt="Skema Sistem Desalinasi"
                                    className="w-full h-auto mx-auto"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowSchemaModal(false)}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
