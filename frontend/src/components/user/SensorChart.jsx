import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import PropTypes from 'prop-types';

const SensorChart = ({ data, dataKeys }) => {
    const defaultDataKeys = [
        { key: 'humidity', name: 'Kelembapan (%)', color: '#3b82f6' },
        { key: 'temperature', name: 'Suhu (°C)', color: '#f97316' }
    ];

    const keysToRender = dataKeys || defaultDataKeys;

    // Sparkline-style tooltip
    /* eslint-disable react/prop-types */
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
                {payload.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-gray-600">{entry.name}:</span>
                        <span className="font-bold text-gray-800">{Number(entry.value).toFixed(2)}</span>
                    </div>
                ))}
            </div>
        );
    };
    /* eslint-enable react/prop-types */

    // Legend component
    const SparklineLegend = () => (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
            {keysToRender.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-medium text-gray-500">{item.name}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div>
            <div className="w-full" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            {keysToRender.map((item) => (
                                <linearGradient
                                    key={`area-${item.key}`}
                                    id={`area-${item.key}`}
                                    x1="0" y1="0" x2="0" y2="1"
                                >
                                    <stop offset="0%" stopColor={item.color} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={item.color} stopOpacity={0.02} />
                                </linearGradient>
                            ))}
                        </defs>
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            domain={['dataMin - 1', 'dataMax + 1']}
                            width={40}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {keysToRender.map((item) => (
                            <Area
                                key={item.key}
                                type="monotone"
                                dataKey={item.key}
                                name={item.name}
                                stroke={item.color}
                                strokeWidth={2.5}
                                fill={`url(#area-${item.key})`}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: item.color }}
                                isAnimationActive={false}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <SparklineLegend />
        </div>
    );
};

SensorChart.propTypes = {
    data: PropTypes.array.isRequired,
    dataKeys: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        color: PropTypes.string.isRequired
    }))
};

// PropTypes for CustomTooltip internal component
const tooltipPropTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    label: PropTypes.string
};
// Mark as used to suppress warnings
tooltipPropTypes;

export default SensorChart;
