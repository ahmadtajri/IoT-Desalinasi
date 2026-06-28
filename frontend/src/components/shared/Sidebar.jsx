import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ChevronLeft, ChevronRight, Activity, X, FileImage, Cog, Shield, BookOpen } from 'lucide-react';
import logoIcon from '../../assets/icons/icon-x192.png';
import useBackendStatus from '../../hooks/useBackendStatus';
import { useLogger } from '../../context/LoggerContext';
import { useAuth } from '../../context/AuthContext';
import SchemaViewer from './SchemaViewer';
import SchemaManagement from '../admin/SchemaManagement';
import PropTypes from 'prop-types';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showSchemaModal, setShowSchemaModal] = useState(false);
    const [schemaAnimated, setSchemaAnimated] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);

    // Animate in/out for bottom sheet
    useEffect(() => {
        if (showSchemaModal) {
            requestAnimationFrame(() => setSchemaAnimated(true));
        } else {
            setSchemaAnimated(false);
        }
    }, [showSchemaModal]);

    const closeSchemaModal = () => {
        setSchemaAnimated(false);
        setTimeout(() => {
            setShowSchemaModal(false);
            setIsManageMode(false);
        }, 350);
    };
    const location = useLocation();
    const { isOnline, isChecking } = useBackendStatus(5000);
    const { isAdmin } = useAuth();

    // Get machine status from LoggerContext
    // Machine is active if at least one sensor is active
    const { isMachineActive } = useLogger();
    const isMachineRunning = isMachineActive;

    const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

    // Build nav items based on user role
    const navItems = [
        { path: '/', label: 'Beranda', icon: LayoutDashboard },
        { path: '/report', label: 'Laporan', icon: FileText },
        // Daily Log: hanya untuk user biasa — admin menggunakan tab "Log Harian" di Panel Admin
        ...(!isAdmin() ? [{ path: '/daily-log', label: 'Daily Log', icon: BookOpen }] : []),
        ...(isAdmin() ? [{ path: '/admin', label: 'Panel Admin', icon: Shield }] : []),
    ];

    // Determine status color and text based on backend connection
    const statusColor = isOnline ? 'green' : 'red';
    const statusText = isChecking ? 'Memeriksa...' : (isOnline ? 'Sistem Online' : 'Sistem Offline');
    const statusSubtext = isOnline ? 'Terhubung' : 'Tidak Berjalan';

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
                        <h2 className="text-xl font-bold text-gray-800">IoT Desalinasi</h2>
                        <p className="text-xs text-gray-500">Sistem Desalinasi</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 mt-2">
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
                                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative text-gray-600 hover:bg-blue-50 hover:text-blue-600 ${isCollapsed ? 'md:justify-center' : ''}`}
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
                            <p className="text-xs text-gray-500 font-medium uppercase mb-3">Status Sistem</p>

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

            {/* Schema Modal - Bottom Sheet on Mobile, Center Modal on Desktop */}
            {showSchemaModal && (
                <>
                    {/* Backdrop */}
                    <div
                        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-350 ${schemaAnimated ? 'opacity-100' : 'opacity-0'}`}
                        onClick={closeSchemaModal}
                    />

                    {/* Mobile: Bottom Sheet */}
                    <div
                        className={`
                            fixed bottom-0 left-0 right-0 z-[101]
                            md:hidden
                            bg-white rounded-t-3xl shadow-2xl
                            flex flex-col
                            h-[92vh]
                            transition-transform duration-350 ease-out
                            ${schemaAnimated ? 'translate-y-0' : 'translate-y-full'}
                        `}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-blue-500 flex items-center justify-between px-4 py-3 flex-shrink-0">
                            <div className="flex items-center gap-2 text-white flex-1 min-w-0">
                                <div className="p-1.5 bg-white/20 rounded-lg flex-shrink-0">
                                    <FileImage size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-base font-bold truncate">Skema Sistem Desalinasi</h2>
                                    <p className="text-blue-100 text-xs truncate">Diagram alur proses desalinasi air laut</p>
                                </div>
                            </div>
                            <button
                                onClick={closeSchemaModal}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden bg-gray-50 flex flex-col min-h-0">
                            <div className="w-full h-full overflow-hidden">
                                {isManageMode && isAdmin() ? (
                                    <div className="h-full overflow-auto p-3">
                                        <SchemaManagement />
                                    </div>
                                ) : (
                                    <SchemaViewer />
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-3 py-3 border-t border-gray-200 flex justify-between items-center gap-2 flex-shrink-0 pb-safe">
                            {isAdmin() && (
                                <button
                                    onClick={() => setIsManageMode(!isManageMode)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 shadow-sm flex-1 justify-center ${isManageMode
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {isManageMode ? (
                                        <><FileImage size={13} /><span>View Schema</span></>
                                    ) : (
                                        <><Cog size={13} /><span>Manage</span></>
                                    )}
                                </button>
                            )}
                            {!isAdmin() && <div />}
                            <button
                                onClick={closeSchemaModal}
                                className="px-4 py-2 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-all duration-200 text-sm flex-1"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>

                    {/* Desktop: Center Modal */}
                    <div
                        className={`
                            fixed inset-0 z-[101]
                            hidden md:flex
                            items-center justify-center p-4
                            transition-opacity duration-350
                            ${schemaAnimated ? 'opacity-100' : 'opacity-0'}
                        `}
                        onClick={closeSchemaModal}
                    >
                        <div
                            className={`bg-white rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden transition-transform duration-350 ${schemaAnimated ? 'scale-100' : 'scale-95'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="bg-blue-500 p-6 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3 text-white flex-1 min-w-0">
                                    <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                                        <FileImage size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-2xl font-bold truncate">Skema Sistem Desalinasi</h2>
                                        <p className="text-blue-100 text-sm mt-1 truncate">Diagram alur proses desalinasi air laut</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeSchemaModal}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 ml-2"
                                >
                                    <X className="w-6 h-6 text-white" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-hidden bg-gray-50 flex flex-col min-h-0">
                                <div className="w-full h-full overflow-hidden">
                                    {isManageMode && isAdmin() ? (
                                        <div className="h-full overflow-auto p-6">
                                            <SchemaManagement />
                                        </div>
                                    ) : (
                                        <SchemaViewer />
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center gap-3 flex-shrink-0">
                                {isAdmin() && (
                                    <button
                                        onClick={() => setIsManageMode(!isManageMode)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm ${isManageMode
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {isManageMode ? (
                                            <><FileImage size={16} /><span>View Schema</span></>
                                        ) : (
                                            <><Cog size={16} /><span>Manage Schema</span></>
                                        )}
                                    </button>
                                )}
                                {!isAdmin() && <div />}
                                <button
                                    onClick={closeSchemaModal}
                                    className="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md text-base"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

Sidebar.propTypes = {
    isMobileOpen: PropTypes.bool.isRequired,
    setIsMobileOpen: PropTypes.func.isRequired
};

export default Sidebar;
