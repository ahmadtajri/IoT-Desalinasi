import { Scale } from 'lucide-react';
import PropTypes from 'prop-types';

const WaterWeightCard = ({ weightInGrams }) => {
    // Ensure safe value (handle null/undefined)
    const safeWeight = (weightInGrams === null || weightInGrams === undefined) ? 0 : Number(weightInGrams);

    // Convert grams to kg (always display in kg)
    const weightInKg = (safeWeight / 1000).toFixed(3);

    // Format for display - show more decimals for small values
    const formatWeight = (kg) => {
        const num = parseFloat(kg);
        if (num < 0.001) return '0.000';
        if (num < 1) return num.toFixed(3);
        if (num < 10) return num.toFixed(2);
        return num.toFixed(1);
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
            {/* Header */}
            <div className="bg-violet-500 px-6 py-4">
                <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Hasil Desalinasi</h3>
                        <p className="text-sm text-white/80">Berat air bersih yang dihasilkan</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col justify-center flex-1">
                {/* Main Weight Display */}
                <div className="text-center mb-4">
                    <span className="text-gray-500 text-sm font-medium">Total Produksi</span>
                    <div className="flex items-baseline justify-center gap-2 mt-1">
                        <span className="text-5xl font-bold text-violet-600">
                            {formatWeight(weightInKg)}
                        </span>
                        <span className="text-2xl font-medium text-gray-400">kg</span>
                    </div>
                </div>

                {/* Gram Display */}
                <div className="mt-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-500 mb-2">Dalam Gram</p>
                        <p className="text-lg font-bold text-gray-700">
                            {safeWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                            <span className="text-sm font-normal text-gray-400 ml-1">g</span>
                        </p>
                    </div>
                </div>


            </div>
        </div>
    );
};

WaterWeightCard.propTypes = {
    weightInGrams: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default WaterWeightCard;
