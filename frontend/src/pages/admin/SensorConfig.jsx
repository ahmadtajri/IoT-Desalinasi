import { Thermometer } from 'lucide-react';
import SensorConfigPanel from '../../components/admin/SensorConfigPanel';

export default function SensorConfig() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <Thermometer className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Konfigurasi Sensor</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Atur nama display, kategori, dan status sensor</p>
                    </div>
                </div>
            </div>
            <SensorConfigPanel onConfigChange={() => { }} />
        </div>
    );
}
