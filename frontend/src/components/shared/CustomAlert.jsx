import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';

const CustomAlert = ({ isOpen, onClose, title, message, type = 'info', isConfirm = false, onConfirm }) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={40} className="text-green-500" />;
            case 'error': return <AlertCircle size={40} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={40} className="text-orange-500" />;
            default: return <Info size={40} className="text-blue-500" />;
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case 'success': return 'text-green-700';
            case 'error': return 'text-red-700';
            case 'warning': return 'text-orange-700';
            default: return 'text-blue-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative transform transition-all scale-100 animate-scale-in">
                {/* Close button absolute */}
                {!isConfirm && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}

                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 p-3 rounded-full bg-gray-50">
                        {getIcon()}
                    </div>

                    <h3 className={`text-xl font-bold mb-2 ${getTitleColor()}`}>
                        {title}
                    </h3>

                    <p className="text-gray-600 mb-8 whitespace-pre-line">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        {isConfirm ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 px-4 py-2.5 text-white rounded-xl transition-colors font-medium
                                        ${type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                                    `}
                                >
                                    Ya, Lanjutkan
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                            >
                                Mengerti
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

CustomAlert.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
    isConfirm: PropTypes.bool,
    onConfirm: PropTypes.func
};

export default CustomAlert;
