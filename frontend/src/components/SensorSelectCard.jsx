import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

const SensorSelectCard = ({
    title,
    subtitle,
    value,
    unit,
    icon: Icon,
    colorTheme,
    options,
    selectedOption,
    onSelectChange,
    sensorStatus = {},
    showDropdown = true
}) => {
    // Color configurations
    const themes = {
        blue: {
            bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
            border: 'border-blue-200',
            text: 'text-blue-600',
            iconBg: 'bg-blue-100',
            barBg: 'bg-blue-100',
            barFill: 'bg-gradient-to-r from-blue-400 to-cyan-500',
            valueColor: 'text-blue-700',
            selectBg: 'bg-white',
            selectBorder: 'border-blue-200 focus:ring-blue-300',
            headerBg: 'bg-gradient-to-r from-blue-500 to-cyan-500'
        },
        orange: {
            bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
            border: 'border-orange-200',
            text: 'text-orange-600',
            iconBg: 'bg-orange-100',
            barBg: 'bg-orange-100',
            barFill: 'bg-gradient-to-r from-orange-400 to-red-500',
            valueColor: 'text-orange-700',
            selectBg: 'bg-white',
            selectBorder: 'border-orange-200 focus:ring-orange-300',
            headerBg: 'bg-gradient-to-r from-orange-500 to-red-500'
        },
        cyan: {
            bg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
            border: 'border-cyan-200',
            text: 'text-cyan-600',
            iconBg: 'bg-cyan-100',
            barBg: 'bg-cyan-100',
            barFill: 'bg-gradient-to-r from-cyan-400 to-blue-500',
            valueColor: 'text-cyan-700',
            selectBg: 'bg-white',
            selectBorder: 'border-cyan-200 focus:ring-cyan-300',
            headerBg: 'bg-gradient-to-r from-cyan-500 to-blue-500'
        }
    };

    const theme = themes[colorTheme] || themes.blue;

    // Format value to 2 decimal places
    const formatValue = (val) => {
        if (val === null || val === undefined || isNaN(val)) return '--';
        return Number(val).toFixed(2);
    };

    // Current sensor status
    const isCurrentSensorActive = sensorStatus[selectedOption] ?? true;

    return (
        <div className={`${theme.bg} rounded-2xl shadow-lg border ${theme.border} overflow-hidden transition-all duration-300 hover:shadow-xl`}>
            {/* Card Header */}
            <div className={`${theme.headerBg} px-6 py-4`}>
                <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">{title}</h3>
                        <p className="text-sm text-white text-opacity-80">{subtitle}</p>
                    </div>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
                {/* Sensor Selection Dropdown */}
                {showDropdown && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Pilih Sensor
                        </label>
                        <div className="relative">
                            <select
                                value={selectedOption}
                                onChange={(e) => onSelectChange(e.target.value)}
                                className={`w-full px-4 py-3 ${theme.selectBg} border ${theme.selectBorder} rounded-xl text-gray-700 font-medium outline-none focus:ring-2 cursor-pointer appearance-none shadow-sm transition-all duration-200`}
                            >
                                {options.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>

                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={20} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Value Display */}
                <div className="text-center flex flex-col justify-center min-h-[120px]">
                    {isCurrentSensorActive ? (
                        <div className="flex items-baseline justify-center gap-1">
                            <span className={`text-6xl font-bold ${theme.valueColor}`}>
                                {formatValue(value)}
                            </span>
                            <span className={`text-2xl font-medium ${theme.valueColor}`}>
                                {unit}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-5xl font-bold text-gray-300">--</span>
                            <span className="text-xl font-medium text-gray-300">{unit}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SensorSelectCard;
