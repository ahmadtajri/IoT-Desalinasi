import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Alert Component - Reusable inline alert for notifications
 * @param {string} type - Type of alert: 'success', 'error', 'warning', 'info'
 * @param {string} message - Alert message to display
 * @param {function} onClose - Optional close handler
 * @param {string} title - Optional title for the alert
 * @param {boolean} dismissible - Whether the alert can be dismissed (default: true)
 */
const Alert = ({ type = 'info', message, onClose, title, dismissible = true }) => {
    if (!message) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={20} className="flex-shrink-0" />;
            case 'error':
                return <AlertCircle size={20} className="flex-shrink-0" />;
            case 'warning':
                return <AlertTriangle size={20} className="flex-shrink-0" />;
            default:
                return <Info size={20} className="flex-shrink-0" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-green-50 border-green-200 text-green-800',
                    icon: 'text-green-500',
                    title: 'text-green-800',
                    message: 'text-green-700',
                    closeBtn: 'text-green-600 hover:text-green-800'
                };
            case 'error':
                return {
                    container: 'bg-red-50 border-red-200 text-red-800',
                    icon: 'text-red-500',
                    title: 'text-red-800',
                    message: 'text-red-700',
                    closeBtn: 'text-red-600 hover:text-red-800'
                };
            case 'warning':
                return {
                    container: 'bg-orange-50 border-orange-200 text-orange-800',
                    icon: 'text-orange-500',
                    title: 'text-orange-800',
                    message: 'text-orange-700',
                    closeBtn: 'text-orange-600 hover:text-orange-800'
                };
            default:
                return {
                    container: 'bg-blue-50 border-blue-200 text-blue-800',
                    icon: 'text-blue-500',
                    title: 'text-blue-800',
                    message: 'text-blue-700',
                    closeBtn: 'text-blue-600 hover:text-blue-800'
                };
        }
    };

    const styles = getStyles();

    return (
        <>
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles.container} mb-4 animate-fade-in`}>
                <div className={styles.icon}>
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    {title && (
                        <h4 className={`font-semibold ${styles.title} mb-1`}>
                            {title}
                        </h4>
                    )}
                    <p className={`text-sm ${styles.message} ${title ? '' : 'leading-5'}`}>
                        {message}
                    </p>
                </div>
                {dismissible && onClose && (
                    <button
                        onClick={onClose}
                        className={`${styles.closeBtn} transition-colors p-1 rounded hover:bg-white/50`}
                        aria-label="Close alert"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </>
    );
};

Alert.propTypes = {
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
    message: PropTypes.string,
    onClose: PropTypes.func,
    title: PropTypes.string,
    dismissible: PropTypes.bool
};

export default Alert;
