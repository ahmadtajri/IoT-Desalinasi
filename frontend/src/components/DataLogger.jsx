import React, { useState } from 'react';
import { Play, Pause, Settings, Download } from 'lucide-react';

const DataLogger = ({ onIntervalChange, isLogging, onToggleLogging }) => {
    const [interval, setInterval] = useState('5');
    const [showSettings, setShowSettings] = useState(false);

    const intervals = [
        { value: '5', label: '5 Detik' },
        { value: '30', label: '30 Detik' },
        { value: '60', label: '1 Menit' },
        { value: '1800', label: '30 Menit' }
    ];

    const handleIntervalChange = (newInterval) => {
        setInterval(newInterval);
        onIntervalChange(parseInt(newInterval) * 1000);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Settings className="text-purple-600" size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">Data Logger</h3>
                        <p className="text-sm text-gray-500">
                            {isLogging ? 'Pencatatan aktif' : 'Pencatatan tidak aktif'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onToggleLogging}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isLogging
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                >
                    {isLogging ? (
                        <>
                            <Pause size={18} />
                            Stop
                        </>
                    ) : (
                        <>
                            <Play size={18} />
                            Start
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Interval Pencatatan
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {intervals.map((int) => (
                            <button
                                key={int.value}
                                onClick={() => handleIntervalChange(int.value)}
                                disabled={isLogging}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${interval === int.value
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    } ${isLogging ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {int.label}
                            </button>
                        ))}
                    </div>
                </div>

                {isLogging && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-700 font-medium">
                            Merekam setiap {intervals.find(i => i.value === interval)?.label.toLowerCase()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataLogger;
