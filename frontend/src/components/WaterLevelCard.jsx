import React from 'react';
import { Power, Activity, Droplets } from 'lucide-react';

const WaterLevelCard = ({ value, status, pumpStatus = false }) => {
    const percentage = value !== null ? Math.min(Math.max(parseFloat(value), 0), 100) : 0;

    // pumpStatus: true = ON, false = OFF (dikirim dari ESP32)
    const isPumpOn = pumpStatus === true || pumpStatus === 'on' || pumpStatus === 'ON' || pumpStatus === 1;

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-cyan-100 overflow-hidden flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
                <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Droplets size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Water Level</h3>
                        <p className="text-sm text-white/80">Monitoring ketinggian air</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col justify-center flex-1">
                {/* Main Value Display */}
                <div className="text-center mb-4">
                    <span className="text-gray-500 text-sm font-medium">Level Saat Ini</span>
                    <div className="flex items-baseline justify-center gap-1 mt-1">
                        <span className="text-5xl font-bold text-cyan-600">
                            {value !== null ? value : '--'}
                        </span>
                        <span className="text-2xl font-medium text-gray-400">%</span>
                    </div>
                </div>

                {/* Additional Info Grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* Pump Status */}
                    <div className={`rounded-xl p-3 text-center ${isPumpOn ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500 mb-1">Status Pompa</p>
                        <div className="flex items-center justify-center gap-1">
                            {isPumpOn ? (
                                <>
                                    <Power size={16} className="text-emerald-500" />
                                    <p className="text-sm font-bold text-emerald-600">ON</p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"></div>
                                </>
                            ) : (
                                <>
                                    <Power size={16} className="text-gray-400" />
                                    <p className="text-sm font-bold text-gray-500">OFF</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sensor Status */}
                    <div className={`rounded-xl p-3 text-center ${status ? 'bg-cyan-50' : 'bg-red-50'}`}>
                        <p className="text-xs text-gray-500 mb-1">Koneksi</p>
                        <div className="flex items-center justify-center gap-1">
                            {status ? (
                                <>
                                    <Activity size={16} className="text-cyan-500" />
                                    <p className="text-sm font-bold text-cyan-600">Online</p>
                                </>
                            ) : (
                                <>
                                    <Activity size={16} className="text-red-500" />
                                    <p className="text-sm font-bold text-red-500">Offline</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default WaterLevelCard;
