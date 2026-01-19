import React from 'react';
import { Scale, TrendingUp } from 'lucide-react';

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
        <div className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4">
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
                        <span className="text-5xl font-bold text-teal-600">
                            {formatWeight(weightInKg)}
                        </span>
                        <span className="text-2xl font-medium text-gray-400">kg</span>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* Grams Display */}
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Dalam Gram</p>
                        <p className="text-lg font-bold text-gray-700">
                            {safeWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                            <span className="text-sm font-normal text-gray-400 ml-1">g</span>
                        </p>
                    </div>

                    {/* Status Indicator */}
                    <div className={`rounded-xl p-3 text-center ${safeWeight > 0 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <div className="flex items-center justify-center gap-1">
                            {safeWeight > 0 ? (
                                <>
                                    <TrendingUp size={16} className="text-emerald-500" />
                                    <p className="text-sm font-bold text-emerald-600">Produksi</p>
                                </>
                            ) : (
                                <p className="text-sm font-bold text-gray-500">Menunggu</p>
                            )}
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default WaterWeightCard;
