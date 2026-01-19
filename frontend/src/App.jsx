import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import { LoggerProvider } from './context/LoggerContext';
import { Menu } from 'lucide-react';

function App() {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <LoggerProvider>
            <Router>
                <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
                    {/* Sidebar */}
                    <Sidebar
                        isMobileOpen={isMobileSidebarOpen}
                        setIsMobileOpen={setIsMobileSidebarOpen}
                    />

                    {/* Main Content Area */}
                    <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
                        {/* Mobile Header */}
                        <div className="md:hidden bg-white p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsMobileSidebarOpen(true)}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                                >
                                    <Menu size={24} />
                                </button>
                                <span className="font-bold text-gray-800">IoT Monitor</span>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/report" element={<Report />} />
                            </Routes>
                        </main>
                    </div>
                </div>
            </Router>
        </LoggerProvider>
    );
}

export default App;
