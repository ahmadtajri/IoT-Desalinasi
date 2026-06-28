import { ChevronDown } from 'lucide-react';
import PropTypes from 'prop-types';

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
            bg: 'bg-white',
            border: 'border-gray-200',
            text: 'text-blue-600',
            valueColor: 'text-blue-600',
            selectBg: 'bg-gray-50',
            selectBorder: 'border-gray-200 focus:ring-blue-400',
            headerBg: 'bg-blue-500'
        },
        orange: {
            bg: 'bg-white',
            border: 'border-gray-200',
            text: 'text-orange-600',
            valueColor: 'text-orange-600',
            selectBg: 'bg-gray-50',
            selectBorder: 'border-gray-200 focus:ring-orange-400',
            headerBg: 'bg-orange-500'
        },
        cyan: {
            bg: 'bg-white',
            border: 'border-gray-200',
            text: 'text-cyan-600',
            valueColor: 'text-cyan-600',
            selectBg: 'bg-gray-50',
            selectBorder: 'border-gray-200 focus:ring-cyan-400',
            headerBg: 'bg-cyan-500'
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

SensorSelectCard.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    unit: PropTypes.string,
    icon: PropTypes.elementType.isRequired,
    colorTheme: PropTypes.string.isRequired,
    options: PropTypes.array.isRequired,
    selectedOption: PropTypes.string.isRequired,
    onSelectChange: PropTypes.func.isRequired,
    sensorStatus: PropTypes.object,
    showDropdown: PropTypes.bool
};

export default SensorSelectCard;
